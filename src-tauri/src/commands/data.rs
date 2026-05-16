use tauri::State;
use anyhow::Result;

use crate::data::{DataConfig, DataLoader, Interval, KlineBar, CacheManager};
use crate::errors::AppError;

/// 应用状态（共享缓存管理器）
pub struct AppState {
  pub cache: std::sync::Mutex<CacheManager>,
}

/// 从本地文件加载数据
#[tauri::command]
pub async fn load_local_data(
  path: String,
  format: String,
  symbol: String,
  interval: String,
) -> Result<Vec<KlineBar>, AppError> {
  let interval = parse_interval(&interval)?;

  let klines = match format.as_str() {
    "csv" => DataLoader::load_csv(&path, &symbol, interval)?,
    "json" => DataLoader::load_json(&path, &symbol, interval)?,
    "parquet" => DataLoader::load_parquet(&path, &symbol, interval)?,
    _ => return Err(AppError::InvalidFormat(format)),
  };

  Ok(klines)
}

/// 从 API 拉取数据
#[tauri::command]
pub async fn load_api_data(
  config: DataConfig,
) -> Result<Vec<KlineBar>, AppError> {
  log::info!("[load_api_data] Called with symbol={}, interval={:?}", config.symbol, config.interval);
  let klines = DataLoader::load_from_api(&config).await?;
  log::info!("[load_api_data] Returning {} klines", klines.len());
  Ok(klines)
}

/// 保存数据到缓存
#[tauri::command]
pub async fn save_to_cache(
  state: State<'_, AppState>,
  data: Vec<KlineBar>,
) -> Result<(), AppError> {
  let mut cache = state.cache.lock().map_err(|e| AppError::Internal(e.to_string()))?;
  cache.save_klines(&data)?;
  Ok(())
}

/// 从缓存查询数据
#[tauri::command]
pub async fn query_from_cache(
  state: State<'_, AppState>,
  symbol: String,
  interval: String,
) -> Result<Vec<KlineBar>, AppError> {
  let interval = parse_interval(&interval)?;
  let cache = state.cache.lock().map_err(|e| AppError::Internal(e.to_string()))?;
  let klines = cache.query_klines(&symbol, interval)?;
  Ok(klines)
}

/// 增量同步数据
#[tauri::command]
pub async fn sync_incremental(
  state: State<'_, AppState>,
  config: DataConfig,
) -> Result<usize, AppError> {
  // 先获取最新时间
  let _latest = {
    let cache = state.cache.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    cache.get_latest_time(&config.symbol, config.interval)?
  };

  // 拉取增量数据（await 前已释放 MutexGuard）
  let klines = DataLoader::load_from_api(&config).await?;
  let count = klines.len();

  // 保存到缓存
  let mut cache = state.cache.lock().map_err(|e| AppError::Internal(e.to_string()))?;
  cache.save_klines(&klines)?;

  Ok(count)
}

/// 清除缓存
#[tauri::command]
pub async fn clear_cache(
  state: State<'_, AppState>,
  symbol: String,
  interval: Option<String>,
) -> Result<(), AppError> {
  let interval = interval.map(|s| parse_interval(&s)).transpose()?;
  let cache = state.cache.lock().map_err(|e| AppError::Internal(e.to_string()))?;
  cache.clear_cache(&symbol, interval)?;
  Ok(())
}

/// 解析周期字符串
fn parse_interval(s: &str) -> Result<Interval, AppError> {
  match s {
    "5min" | "5" => Ok(Interval::Min5),
    "15min" | "15" => Ok(Interval::Min15),
    "30min" | "30" => Ok(Interval::Min30),
    "day" | "1d" => Ok(Interval::Day1),
    _ => Err(AppError::InvalidInterval(s.to_string())),
  }
}
