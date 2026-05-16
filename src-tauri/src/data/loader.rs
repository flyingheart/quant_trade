use anyhow::{bail, Result};
use polars::prelude::*;
use std::fs::File;

use super::types::{DataConfig, Interval, KlineBar};

/// 数据加载器
pub struct DataLoader;

impl DataLoader {
  /// 从 CSV 文件加载 K 线数据
  pub fn load_csv(path: &str, symbol: &str, interval: Interval) -> Result<Vec<KlineBar>> {
    let file = File::open(path)?;
    let df = CsvReader::new(file).finish()?;
    Self::df_to_klines(&df, symbol, interval)
  }

  /// 从 JSON 文件加载 K 线数据
  pub fn load_json(path: &str, symbol: &str, interval: Interval) -> Result<Vec<KlineBar>> {
    let file = File::open(path)?;
    let df = JsonReader::new(file).finish()?;
    Self::df_to_klines(&df, symbol, interval)
  }

  /// 从 Parquet 文件加载 K 线数据
  pub fn load_parquet(path: &str, symbol: &str, interval: Interval) -> Result<Vec<KlineBar>> {
    let file = File::open(path)?;
    let df = ParquetReader::new(file).finish()?;
    Self::df_to_klines(&df, symbol, interval)
  }

  /// 从 API 拉取数据
  pub async fn load_from_api(config: &DataConfig) -> Result<Vec<KlineBar>> {
    match &config.source {
      // 腾讯财经API域名: web.ifzq.gtimg.cn
      super::types::DataSource::RestApi { url, .. } if url.contains("gtimg.cn") || url.contains("tencent") => {
        Self::fetch_tencent_finance(config).await
      }
      super::types::DataSource::RestApi { url, .. } if url.contains("tdx") => {
        Self::fetch_tdx_kline(config).await
      }
      _ => bail!("不支持的数据源"),
    }
  }

  /// 数据清洗：去重、补全缺失值、校验异常
  pub fn clean(data: &mut Vec<KlineBar>) {
    // 按时间排序
    data.sort_by_key(|k| k.timestamp);

    // 去重
    data.dedup_by_key(|k| k.timestamp);

    // 过滤异常值
    data.retain(|k| {
      k.open > 0.0
        && k.high > 0.0
        && k.low > 0.0
        && k.close > 0.0
        && k.high >= k.low
        && k.high >= k.open
        && k.high >= k.close
        && k.low <= k.open
        && k.low <= k.close
    });
  }

  /// DataFrame 转 KlineBar 向量
  fn df_to_klines(df: &DataFrame, symbol: &str, interval: Interval) -> Result<Vec<KlineBar>> {
    let len = df.height();
    let mut klines = Vec::with_capacity(len);

    // 尝试获取时间列（可能是 datetime 或 string）
    let time_col = df.column("time")?;
    let timestamps: Vec<i64> = match time_col.dtype() {
      DataType::Datetime(_, _) => {
        let col = time_col.datetime()?;
        (0..len).map(|i| col.get(i).unwrap_or(0)).collect()
      }
      DataType::String => {
        let col = time_col.str()?;
        (0..len).map(|i| {
          let s = col.get(i).unwrap_or("");
          // 尝试解析多种时间格式
          chrono::DateTime::parse_from_rfc3339(s)
            .map(|dt| dt.with_timezone(&chrono::Utc).timestamp_millis())
            .or_else(|_| {
              chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
                .map(|dt| dt.and_utc().timestamp_millis())
            })
            .unwrap_or(0)
        }).collect()
      }
      _ => bail!("不支持的时间列类型"),
    };

    let open_col = df.column("open")?;
    let high_col = df.column("high")?;
    let low_col = df.column("low")?;
    let close_col = df.column("close")?;
    let volume_col = df.column("volume")?;

    // 辅助函数：支持从 i64 或 f64 列获取值
    let get_f64 = |col: &Column, i: usize| -> f64 {
      match col.dtype() {
        DataType::Float64 => col.f64().unwrap().get(i).unwrap_or(0.0),
        DataType::Int64 => col.i64().unwrap().get(i).unwrap_or(0) as f64,
        _ => 0.0,
      }
    };

    for i in 0..len {
      let dt = chrono::DateTime::from_timestamp_millis(timestamps[i]).unwrap_or_default();

      klines.push(KlineBar::new(
        dt,
        get_f64(open_col, i),
        get_f64(high_col, i),
        get_f64(low_col, i),
        get_f64(close_col, i),
        get_f64(volume_col, i),
        symbol.to_string(),
        interval,
      ));
    }

    Ok(klines)
  }

  /// 腾讯财经 API 数据拉取（A股/港股/美股）
  async fn fetch_tencent_finance(config: &DataConfig) -> Result<Vec<KlineBar>> {
    let client = reqwest::Client::new();
    // 腾讯API周期参数: 5/15/30 表示分钟线, day 表示日线
    let interval_map = match config.interval {
      Interval::Min5 => "5",
      Interval::Min15 => "15",
      Interval::Min30 => "30",
      Interval::Day1 => "day",
    };

    // 正确参数格式: sh000001,day,,,数量,qfq
    // 腾讯API最大支持约1000条日线数据（约4年）
    let url = format!(
      "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={},{},,,1000,qfq",
      config.symbol, interval_map
    );

    log::info!("Fetching Tencent finance data from: {}", url);
    let resp = client.get(&url).send().await?.text().await?;
    
    let json: serde_json::Value = serde_json::from_str(&resp)?;
    Self::parse_tencent_klines(&json, &config.symbol, config.interval)
  }

  /// 通达信 K 线数据拉取（A股）- 使用腾讯财经 API 作为替代
  async fn fetch_tdx_kline(config: &DataConfig) -> Result<Vec<KlineBar>> {
    // A股也使用腾讯财经API获取数据
    Self::fetch_tencent_finance(config).await
  }

  /// 辅助函数：从 JSON 值中解析浮点数（支持字符串和数字格式）
  fn parse_f64(val: &serde_json::Value) -> f64 {
    if let Some(v) = val.as_f64() {
      v
    } else if let Some(s) = val.as_str() {
      s.parse().unwrap_or(0.0)
    } else {
      0.0
    }
  }

  /// 解析腾讯财经 K 线数据
  fn parse_tencent_klines(
    resp: &serde_json::Value,
    symbol: &str,
    interval: Interval,
  ) -> Result<Vec<KlineBar>> {
    let mut klines = Vec::new();

    if let Some(data) = resp.get("data") {
      // 格式1: data.{symbol}.day (指数) 或 data.{symbol}.qfqday (个股前复权)
      if let Some(symbol_data) = data.get(symbol) {
        if let Some(day_data) = symbol_data.get("qfqday")
          .or_else(|| symbol_data.get("day"))
          .and_then(|v| v.as_array())
        {
          for item in day_data {
            if let Some(arr) = item.as_array() {
              if arr.len() >= 6 {
                let timestamp = arr[0].as_str().unwrap_or("");
                let open = Self::parse_f64(&arr[1]);
                let close = Self::parse_f64(&arr[2]);
                let high = Self::parse_f64(&arr[3]);
                let low = Self::parse_f64(&arr[4]);
                let volume = Self::parse_f64(&arr[5]);

                // 日线格式: "2024-01-15"
                if let Ok(dt) = chrono::NaiveDate::parse_from_str(timestamp, "%Y-%m-%d") {
                  klines.push(KlineBar::new(
                    chrono::DateTime::from_naive_utc_and_offset(dt.and_hms_opt(0, 0, 0).unwrap(), chrono::Utc),
                    open,
                    high,
                    low,
                    close,
                    volume,
                    symbol.to_string(),
                    interval,
                  ));
                }
              }
            }
          }
        }
      }
      // 格式2: data.kline.items (旧格式)
      else if let Some(kline_data) = data.get("kline") {
        if let Some(items) = kline_data.get("items").and_then(|v| v.as_array()) {
          for item in items {
            if let Some(arr) = item.as_array() {
              if arr.len() >= 6 {
                let timestamp = arr[0].as_str().unwrap_or("");
                let open = Self::parse_f64(&arr[1]);
                let close = Self::parse_f64(&arr[2]);
                let high = Self::parse_f64(&arr[3]);
                let low = Self::parse_f64(&arr[4]);
                let volume = Self::parse_f64(&arr[5]);

                if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%d %H:%M:%S") {
                  klines.push(KlineBar::new(
                    chrono::DateTime::from_naive_utc_and_offset(dt, chrono::Utc),
                    open,
                    high,
                    low,
                    close,
                    volume,
                    symbol.to_string(),
                    interval,
                  ));
                }
              }
            }
          }
        }
      }
    }

    Ok(klines)
  }

  /// 解析通达信 K 线数据
  fn parse_tdx_klines(
    resp: &[serde_json::Value],
    symbol: &str,
    interval: Interval,
  ) -> Result<Vec<KlineBar>> {
    let mut klines = Vec::new();

    for k in resp {
      if let (Some(timestamp), Some(open), Some(high), Some(low), Some(close), Some(volume)) = (
        k.get("time").and_then(|v| v.as_str()),
        k.get("open").and_then(|v| v.as_f64()),
        k.get("high").and_then(|v| v.as_f64()),
        k.get("low").and_then(|v| v.as_f64()),
        k.get("close").and_then(|v| v.as_f64()),
        k.get("volume").and_then(|v| v.as_f64()),
      ) {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(timestamp) {
          klines.push(KlineBar::new(
            dt.with_timezone(&chrono::Utc),
            open,
            high,
            low,
            close,
            volume,
            symbol.to_string(),
            interval,
          ));
        }
      }
    }

    Ok(klines)
  }
}
