use anyhow::{bail, Context, Result};

use super::types::{Interval, KlineBar};

const TDX_SERVERS: &[&str] = &[
  "115.238.56.198:7709",
  "115.238.56.50:7709",
  "114.80.149.19:7709",
  "114.80.149.22:7709",
  "119.147.212.222:7709",
];

fn interval_to_category(interval: Interval) -> u16 {
  match interval {
    Interval::Min5 => 0,
    Interval::Min15 => 1,
    Interval::Min30 => 2,
    Interval::Day1 => 9,
  }
}

fn symbol_to_market(symbol: &str) -> u16 {
  if symbol.starts_with("sh") { 1 } else { 0 }
}

fn symbol_to_code(symbol: &str) -> &str {
  if symbol.len() >= 8 { &symbol[2..8] } else { symbol }
}

/// 通达信变长价格解码（与 pytdx / rustdx-complete 算法一致）
fn tdx_price(data: &[u8], pos: &mut usize) -> i32 {
  let mut shl = 6;
  let mut bit = data[*pos] as i32;
  let mut res = bit & 0x3f;
  let sign = (bit & 0x40) == 0;

  while (bit & 0x80) != 0 {
    *pos += 1;
    bit = data[*pos] as i32;
    res += (bit & 0x7f) << shl;
    shl += 7;
  }
  *pos += 1;

  if sign { res } else { -res }
}

/// 通达信 vol/amount 解码（与 pytdx 算法一致）
fn tdx_vol_amount(raw: i32) -> f64 {
  let logpoint = raw >> 24;
  let hleax = (raw >> 16) & 0xff;
  let lheax = (raw >> 8) & 0xff;
  let lleax = raw & 0xff;
  let ecx = logpoint * 2 - 0x7f;
  let edx = logpoint * 2 - 0x86;
  let esi = logpoint * 2 - 0x8e;
  let eax = logpoint * 2 - 0x96;

  let xmm6 = if ecx < 0 { 1.0 / 2.0f64.powi(-ecx) } else { 2.0f64.powi(ecx) };
  let xmm4 = if hleax > 0x80 {
    2.0f64.powi(edx) * 128.0 + (hleax & 0x7f) as f64 * 2.0f64.powi(edx + 1)
  } else if edx >= 0 {
    2.0f64.powi(edx) * hleax as f64
  } else {
    (1.0 / 2.0f64.powi(-edx)) * hleax as f64
  };
  let xmm3 = if (hleax & 0x80) != 0 {
    2.0f64.powi(esi + 1) * lheax as f64
  } else {
    2.0f64.powi(esi) * lheax as f64
  };
  let xmm1 = if (hleax & 0x80) != 0 {
    2.0f64.powi(eax + 1) * lleax as f64
  } else {
    2.0f64.powi(eax) * lleax as f64
  };

  xmm6 + xmm4 + xmm3 + xmm1
}

/// 解析通达信日期（日线/分钟线）
fn tdx_date(data: &[u8], pos: &mut usize, category: u16) -> Option<(i32, u32, u32)> {
  if category < 4 || category == 7 || category == 8 {
    // 分钟线: 位编码
    let day = u16::from_le_bytes([data[*pos], data[*pos + 1]]);
    let _minutes = u16::from_le_bytes([data[*pos + 2], data[*pos + 3]]);
    *pos += 4;
    let year = (day >> 11) + 2004;
    let month = day % 2048 / 100;
    let day_of_m = day % 2048 % 100;
    Some((year as i32, month as u32, day_of_m as u32))
  } else {
    // 日线: YYYYMMDD u32
    let val = u32::from_le_bytes([data[*pos], data[*pos + 1], data[*pos + 2], data[*pos + 3]]);
    *pos += 4;
    let year = (val / 10000) as i32;
    let month = ((val % 10000) / 100) as u32;
    let day = (val % 100) as u32;
    if year >= 1990 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31 {
      Some((year, month, day))
    } else {
      None
    }
  }
}

pub fn fetch_tdx_klines(
  symbol: &str,
  interval: Interval,
) -> Result<Vec<KlineBar>> {
  let market = symbol_to_market(symbol);
  let code = symbol_to_code(symbol).to_string();
  let category = interval_to_category(interval);

  let mut last_err = anyhow::anyhow!("无可用的通达信服务器");

  for server in TDX_SERVERS {
    match try_fetch(server, market, &code, category, symbol, interval) {
      Ok(klines) => {
        if !klines.is_empty() {
          return Ok(klines);
        }
        last_err = anyhow::anyhow!("服务器 {} 返回空数据", server);
      }
      Err(e) => {
        log::warn!("TDX {} 失败: {}", server, e);
        last_err = e;
      }
    }
  }

  Err(last_err)
}

fn try_fetch(
  addr: &str,
  market: u16,
  code: &str,
  category: u16,
  symbol: &str,
  interval: Interval,
) -> Result<Vec<KlineBar>> {
  use rustdx_complete::tcp::stock::Kline;
  use rustdx_complete::tcp::{Tcp, Tdx};

  let addr: std::net::SocketAddr = addr
    .parse()
    .with_context(|| format!("无效地址 {}", addr))?;

  let mut tcp = Tcp::new_with_ip(&addr)
    .with_context(|| format!("连接 {} 失败", addr))?;

  let mut kline = Kline::new(market, code, category, 0, 800);
  let raw = kline
    .recv(&mut tcp)
    .with_context(|| format!("接收 {} {} 失败", symbol, interval))?;

  if raw.len() < 2 {
    bail!("响应数据不足");
  }

  let total_count = u16::from_le_bytes([raw[0], raw[1]]) as usize;
  log::info!("  raw {}b {}条", raw.len(), total_count);

  let mut klines = Vec::new();
  let mut pos = 2;
  let mut base = 0i32;

  while pos + 20 < raw.len() && klines.len() < total_count {
    let save_pos = pos;

    // 解析日期
    let Some((year, month, day)) = tdx_date(&raw, &mut pos, category) else {
      // 日期无效，尝试下一字节对齐
      pos = save_pos + 1;
      base = 0;
      continue;
    };

    // 解析4个价格（第1根K线为绝对值，后续为差值）
    let open_delta = tdx_price(&raw, &mut pos);
    let close_delta = tdx_price(&raw, &mut pos);

    // struct 字段按写顺序求值：open → close → high → low
    base += open_delta;
    let open = base as f64 / 1000.0;

    let close_val = (close_delta + base) as f64 / 1000.0;

    let high_delta = tdx_price(&raw, &mut pos);
    let high = (high_delta + base) as f64 / 1000.0;

    let low_delta = tdx_price(&raw, &mut pos);
    let low = (low_delta + base) as f64 / 1000.0;

    // 成交量 & 成交额
    let vol_raw = i32::from_le_bytes([raw[pos], raw[pos + 1], raw[pos + 2], raw[pos + 3]]);
    pos += 4;
    let amount_raw = i32::from_le_bytes([raw[pos], raw[pos + 1], raw[pos + 2], raw[pos + 3]]);
    pos += 4;

    let volume = tdx_vol_amount(vol_raw);
    let _amount = tdx_vol_amount(amount_raw);

    // 更新 base（close_delta 是相对于当前 base 的差值）
    base += close_delta;

    let dt = chrono::NaiveDate::from_ymd_opt(year, month, day)
      .and_then(|d| d.and_hms_opt(0, 0, 0))
      .map(|nd| chrono::DateTime::from_naive_utc_and_offset(nd, chrono::Utc))
      .unwrap_or_default();

    klines.push(KlineBar::new(dt, open, high, low, close_val, volume, symbol.to_string(), interval));

    if klines.len() <= 3 {
      log::info!("  [{:3}] {}-{:0>2}-{:0>2} O={:.2} H={:.2} L={:.2} C={:.2} V={:.0}",
        klines.len() - 1, year, month, day, open, high, low, close_val, volume);
    }
  }

  log::info!(
    "TDX {} {} {}条",
    symbol,
    match interval {
      Interval::Day1 => "日线",
      Interval::Min30 => "30分",
      Interval::Min15 => "15分",
      Interval::Min5 => "5分",
    },
    klines.len(),
  );

  Ok(klines)
}