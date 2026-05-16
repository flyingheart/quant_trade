/// K线周期枚举
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub enum Interval {
  Min5,
  Min15,
  Min30,
  Day1,
}

impl Interval {
  /// 转换为字符串标识
  pub fn as_str(&self) -> &'static str {
    match self {
      Self::Min5 => "5min",
      Self::Min15 => "15min",
      Self::Min30 => "30min",
      Self::Day1 => "day",
    }
  }
}

impl std::fmt::Display for Interval {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", self.as_str())
  }
}

/// 数据源配置
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DataConfig {
  pub symbol: String,
  pub interval: Interval,
  pub source: DataSource,
}

/// 数据源类型
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum DataSource {
  LocalFile { path: String },
  RestApi { url: String, api_key: Option<String> },
}

/// K线数据结构
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct KlineBar {
  #[serde(skip_serializing)]
  pub timestamp: chrono::DateTime<chrono::Utc>,
  /// 前端友好的时间字符串
  pub time: String,
  pub open: f64,
  pub high: f64,
  pub low: f64,
  pub close: f64,
  pub volume: f64,
  pub symbol: String,
  pub interval: Interval,
}

impl KlineBar {
  /// 创建新的 KlineBar
  pub fn new(
    timestamp: chrono::DateTime<chrono::Utc>,
    open: f64,
    high: f64,
    low: f64,
    close: f64,
    volume: f64,
    symbol: String,
    interval: Interval,
  ) -> Self {
    // 将 UTC 时间转换为日期字符串（日线用日期，分钟线用完整时间）
    let time = match interval {
      Interval::Day1 => timestamp.format("%Y-%m-%d").to_string(),
      _ => timestamp.format("%Y-%m-%d %H:%M:%S").to_string(),
    };

    Self {
      timestamp,
      time,
      open,
      high,
      low,
      close,
      volume,
      symbol,
      interval,
    }
  }
}

/// 数据元信息（用于增量更新）
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DataMeta {
  pub symbol: String,
  pub interval: Interval,
  pub earliest_time: Option<chrono::DateTime<chrono::Utc>>,
  pub latest_time: Option<chrono::DateTime<chrono::Utc>>,
  pub total_count: i64,
  pub last_sync_time: Option<chrono::DateTime<chrono::Utc>>,
}
