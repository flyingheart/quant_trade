use anyhow::Result;
use duckdb::{Connection, params};
use std::path::PathBuf;

use super::types::{DataMeta, Interval, KlineBar};

/// DuckDB 缓存管理器
pub struct CacheManager {
  conn: Connection,
}

impl CacheManager {
  /// 创建或打开数据库连接
  pub fn new(db_path: &PathBuf) -> Result<Self> {
    let conn = Connection::open(db_path)?;
    let mut manager = Self { conn };
    manager.init_tables()?;
    Ok(manager)
  }

  /// 初始化表结构
  fn init_tables(&mut self) -> Result<()> {
    self.conn.execute_batch(
      "
      CREATE TABLE IF NOT EXISTS kline_cache (
        symbol      VARCHAR NOT NULL,
        interval    VARCHAR NOT NULL,
        timestamp   TIMESTAMP NOT NULL,
        open        DOUBLE NOT NULL,
        high        DOUBLE NOT NULL,
        low         DOUBLE NOT NULL,
        close       DOUBLE NOT NULL,
        volume      DOUBLE NOT NULL,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (symbol, interval, timestamp)
      );

      CREATE TABLE IF NOT EXISTS data_meta (
        symbol          VARCHAR NOT NULL,
        interval        VARCHAR NOT NULL,
        earliest_time   TIMESTAMP,
        latest_time     TIMESTAMP,
        total_count     BIGINT DEFAULT 0,
        last_sync_time  TIMESTAMP,
        PRIMARY KEY (symbol, interval)
      );

      CREATE INDEX IF NOT EXISTS idx_kline_symbol_interval
        ON kline_cache (symbol, interval);

      CREATE INDEX IF NOT EXISTS idx_kline_timestamp
        ON kline_cache (timestamp);
      ",
    )?;
    Ok(())
  }

  /// 保存 K 线数据到缓存
  pub fn save_klines(&mut self, klines: &[KlineBar]) -> Result<()> {
    if klines.is_empty() {
      return Ok(());
    }

    let tx = self.conn.transaction()?;

    {
      let mut stmt = tx.prepare(
        "INSERT OR REPLACE INTO kline_cache
         (symbol, interval, timestamp, open, high, low, close, volume)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )?;

      for kline in klines {
        let ts_str = kline.timestamp.to_rfc3339();
        stmt.execute(params![
          kline.symbol,
          kline.interval.as_str(),
          ts_str,
          kline.open,
          kline.high,
          kline.low,
          kline.close,
          kline.volume,
        ])?;
      }
    }

    // 更新元数据
    let symbol = &klines[0].symbol;
    let interval = klines[0].interval.as_str();
    CacheManager::update_meta_static(&tx, symbol, interval)?;

    tx.commit()?;
    Ok(())
  }

  /// 从缓存查询 K 线数据
  pub fn query_klines(&self, symbol: &str, interval: Interval) -> Result<Vec<KlineBar>> {
    let mut stmt = self.conn.prepare(
      "SELECT timestamp, open, high, low, close, volume
       FROM kline_cache
       WHERE symbol = ? AND interval = ?
       ORDER BY timestamp",
    )?;

    let klines = stmt
      .query_map(params![symbol, interval.as_str()], |row| {
        let ts: String = row.get(0)?;
        let dt = ts.parse::<chrono::DateTime<chrono::Utc>>().unwrap_or_default();
        Ok(KlineBar::new(
          dt,
          row.get(1)?,
          row.get(2)?,
          row.get(3)?,
          row.get(4)?,
          row.get(5)?,
          symbol.to_string(),
          interval,
        ))
      })?
      .collect::<Result<Vec<_>, _>>()?;

    Ok(klines)
  }

  /// 查询时间范围内的 K 线数据
  pub fn query_klines_range(
    &self,
    symbol: &str,
    interval: Interval,
    start: chrono::DateTime<chrono::Utc>,
    end: chrono::DateTime<chrono::Utc>,
  ) -> Result<Vec<KlineBar>> {
    let mut stmt = self.conn.prepare(
      "SELECT timestamp, open, high, low, close, volume
       FROM kline_cache
       WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp",
    )?;

    let klines = stmt
      .query_map(
        params![symbol, interval.as_str(), start.to_rfc3339(), end.to_rfc3339()],
        |row| {
          let ts: String = row.get(0)?;
          let dt = ts.parse::<chrono::DateTime<chrono::Utc>>().unwrap_or_default();
          Ok(KlineBar::new(
            dt,
            row.get(1)?,
            row.get(2)?,
            row.get(3)?,
            row.get(4)?,
            row.get(5)?,
            symbol.to_string(),
            interval,
          ))
        },
      )?
      .collect::<Result<Vec<_>, _>>()?;

    Ok(klines)
  }

  /// 增量更新：获取最新时间之后的数据
  pub fn get_latest_time(&self, symbol: &str, interval: Interval) -> Result<Option<chrono::DateTime<chrono::Utc>>> {
    let mut stmt = self.conn.prepare(
      "SELECT latest_time FROM data_meta WHERE symbol = ? AND interval = ?",
    )?;

    let result = stmt.query_row(params![symbol, interval.as_str()], |row| {
      let ts: String = row.get(0)?;
      ts.parse::<chrono::DateTime<chrono::Utc>>().map_err(|_| duckdb::Error::QueryReturnedNoRows)
    });

    match result {
      Ok(time) => Ok(Some(time)),
      Err(_) => Ok(None),
    }
  }

  /// 更新元数据
  fn update_meta_static(
    tx: &duckdb::Transaction<'_>,
    symbol: &str,
    interval: &str,
  ) -> Result<()> {
    tx.execute(
      "INSERT OR REPLACE INTO data_meta
       (symbol, interval, earliest_time, latest_time, total_count, last_sync_time)
       SELECT
         ?,
         ?,
         MIN(timestamp),
         MAX(timestamp),
         COUNT(*),
         CURRENT_TIMESTAMP
       FROM kline_cache
       WHERE symbol = ? AND interval = ?",
      params![symbol, interval, symbol, interval],
    )?;

    Ok(())
  }

  /// 更新元数据（实例方法）
  fn update_meta(
    &self,
    tx: &duckdb::Transaction<'_>,
    symbol: &str,
    interval: &str,
  ) -> Result<()> {
    Self::update_meta_static(tx, symbol, interval)
  }

  /// 获取元数据
  pub fn get_meta(&self, symbol: &str, interval: Interval) -> Result<Option<DataMeta>> {
    let mut stmt = self.conn.prepare(
      "SELECT symbol, interval, earliest_time, latest_time, total_count, last_sync_time
       FROM data_meta
       WHERE symbol = ? AND interval = ?",
    )?;

    let result = stmt.query_row(params![symbol, interval.as_str()], |row| {
      let earliest: Option<String> = row.get(2)?;
      let latest: Option<String> = row.get(3)?;
      let last_sync: Option<String> = row.get(5)?;

      Ok(DataMeta {
        symbol: row.get(0)?,
        interval,
        earliest_time: earliest.and_then(|s| s.parse().ok()),
        latest_time: latest.and_then(|s| s.parse().ok()),
        total_count: row.get(4)?,
        last_sync_time: last_sync.and_then(|s| s.parse().ok()),
      })
    });

    match result {
      Ok(meta) => Ok(Some(meta)),
      Err(_) => Ok(None),
    }
  }

  /// 删除指定标的缓存
  pub fn clear_cache(&self, symbol: &str, interval: Option<Interval>) -> Result<()> {
    match interval {
      Some(interval) => {
        self.conn.execute(
          "DELETE FROM kline_cache WHERE symbol = ? AND interval = ?",
          params![symbol, interval.as_str()],
        )?;
        self.conn.execute(
          "DELETE FROM data_meta WHERE symbol = ? AND interval = ?",
          params![symbol, interval.as_str()],
        )?;
      }
      None => {
        self.conn.execute(
          "DELETE FROM kline_cache WHERE symbol = ?",
          params![symbol],
        )?;
        self.conn.execute(
          "DELETE FROM data_meta WHERE symbol = ?",
          params![symbol],
        )?;
      }
    }
    Ok(())
  }
}
