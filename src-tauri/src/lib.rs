mod data;
mod commands;
mod errors;

use std::path::PathBuf;
use std::sync::Mutex;

use commands::data::{load_local_data, load_api_data, save_to_cache, query_from_cache, sync_incremental, clear_cache, AppState};
use data::CacheManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let db_path = PathBuf::from("quant_trade.db");
  let cache = CacheManager::new(&db_path).expect("Failed to initialize cache");

  tauri::Builder::default()
    .manage(AppState {
      cache: Mutex::new(cache),
    })
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      load_local_data,
      load_api_data,
      save_to_cache,
      query_from_cache,
      sync_incremental,
      clear_cache,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
