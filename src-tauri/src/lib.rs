mod commands;
mod data;
mod errors;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

use commands::data::{
    clear_cache, load_api_data, load_local_data, query_from_cache, save_to_cache, sync_incremental,
    AppState,
};
use data::CacheManager;

/// macOS native: 通过 objc2 操作 NSView 的 CALayer 裁切 16px 圆角
/// 同时设置 window + layer 背景色，防止伸缩时 white flash
#[cfg(target_os = "macos")]
fn apply_macos_rounded_corners(window: &tauri::WebviewWindow) {
    use objc2::msg_send;
    use objc2::runtime::{AnyClass, Object};
    use std::ffi::c_void;

    let ptr = match window.ns_window() {
        Ok(p) => p,
        Err(_) => return,
    };

    unsafe {
        let ns_window = ptr as *mut Object;
        if ns_window.is_null() {
            return;
        }

        let content_view: *mut Object = msg_send![ns_window, contentView];
        if content_view.is_null() {
            return;
        }

        let () = msg_send![content_view, setWantsLayer: 1i8];

        let layer: *mut Object = msg_send![content_view, layer];
        if layer.is_null() {
            return;
        }

        let () = msg_send![layer, setCornerRadius: 16.0f64];
        let () = msg_send![layer, setMasksToBounds: 1i8];

        // 用 clearColor 设置 window + layer 背景，防止收缩白色闪烁且不破坏圆角透空
        if let Some(cls) = AnyClass::get(c"NSColor") {
            let clear: *mut Object = msg_send![cls, clearColor];
            if !clear.is_null() {
                let () = msg_send![ns_window, setBackgroundColor: clear];
                let cg: *const c_void = msg_send![clear, CGColor];
                let () = msg_send![layer, setBackgroundColor: cg];
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 使用当前目录作为数据库路径（为了在沙箱环境中能正常运行）
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

            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                apply_macos_rounded_corners(&window);

                #[cfg(target_os = "macos")]
                let _ = window.set_background_color(Some(tauri::webview::Color(0, 0, 0, 0)));
                #[cfg(target_os = "windows")]
                let _ = window.set_shadow(true);
                window.show()?;
                window.set_focus()?;
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
