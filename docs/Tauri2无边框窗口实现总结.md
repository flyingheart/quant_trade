# Tauri 2.0 无边框窗口 + 自定义标题栏 + 圆角实现总结

## 涉及文件一览

| 文件 | 作用 |
|------|------|
| `src-tauri/tauri.conf.json` | 关闭原生窗口装饰 |
| `frontend/src/components/TopBar.tsx` | 自定义标题栏 + 拖拽区域标注 |
| `frontend/src/index.css` | CSS 层圆角裁切（兜底） |
| `frontend/index.html` | 全屏背景色（闪烁保护） |
| `src-tauri/Cargo.toml` | macOS 原生圆角依赖 |
| `src-tauri/src/lib.rs` | macOS CALayer 圆角裁切逻辑 |

---

## 三层实现

### 第一层：Tauri 配置 — 无边框窗口

```json
{
  "windows": [{
    "decorations": false,
    "backgroundColor": "#0d0e15"
  }]
}
```

- `decorations: false` 移除原生标题栏和边框
- `backgroundColor` 与前端深色背景一致，避免窗口闪烁时露出白底

### 第二层：前端 — 自定义标题栏 + 拖拽

```tsx
<div data-tauri-drag-region>
  ...
  <div data-tauri-no-drag>
    <button>...</button>
  </div>
</div>
```

**关键规则：**
- 顶层标题栏容器标注 `data-tauri-drag-region` → 整个区域可拖拽窗口
- 内部交互控件（按钮、输入框）标注 `data-tauri-no-drag` → 阻止拖拽穿透
- `data-tauri-drag-region` 具有继承性，子元素不加 `data-tauri-no-drag` 也会触发拖拽

### 第三层：圆角窗口

**CSS 兜底（跨平台通用）：**

```css
#root {
  border-radius: 12px;
  overflow: hidden;
}
```

- 将 React 根容器设为圆角 + 溢出隐藏，子内容被裁切
- CSS 层不依赖平台，但不会裁切 webview 自身背景外的区域

**macOS 原生 CALayer（精准裁切）：**

```rust
#[cfg(target_os = "macos")]
fn apply_macos_rounded_corners(window: &tauri::WebviewWindow) {
    use objc2::msg_send;
    use objc2::runtime::Object;

    let ptr = window.ns_window().expect("no ns_window") as *mut Object;
    unsafe {
        let content_view: *mut Object = msg_send![ptr, contentView];
        msg_send![content_view, setWantsLayer: 1i8];
        let layer: *mut Object = msg_send![content_view, layer];
        msg_send![layer, setCornerRadius: 16.0f64];
        msg_send![layer, setMasksToBounds: 1i8];
    }
}
```

**流程：** NSWindow → contentView → 开启 layer-backed → 设置 cornerRadius + masksToBounds

**依赖（仅 macOS 编译）：**

```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.6"
```

**调用时机：** Tauri `setup` 回调中，拿到窗口后立即执行：

```rust
.setup(|app| {
    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "macos")]
        apply_macos_rounded_corners(&window);
        // ...
    }
})
```

---

## 经验总结

### 1. CSS 圆角 vs 原生圆角

CSS `border-radius` 用于跨平台兜底，但存在两个局限：
- 只裁切 webview 内部内容，窗口自身外角仍是方的
- 如果 `html/body` 背景色与 `#root` 不一致，四角会露出底色

macOS 上必须用 `objc2` 操作 NSView 的 CALayer 才能做到真正的窗口级圆角裁切。

### 2. `set_shadow(false)` 的陷阱

原代码中调用 `window.set_shadow(false)` 会关闭 macOS 窗口阴影。无边框窗口建议保留阴影（移除该行或设为 `true`），否则窗口与背景融为一体，用户难以感知窗口边界。

### 3. `ns_window()` 的时序

`WebviewWindow::ns_window()` 在 Tauri 2.0 的 `setup` 阶段即可安全调用，返回 `*mut c_void`。需要转为 `objc2::runtime::Object` 后进行消息发送。

### 4. 指针安全

所有原始指针操作必须先判空：
- `ns_window` 指针
- `contentView` 返回值
- `layer` 返回值

`setWantsLayer:` 必须在访问 `layer` 之前调用，否则 layer 可能为 nil。

### 5. 平台条件编译

```rust
#[cfg(target_os = "macos")]
fn apply_macos_rounded_corners(...) { ... }

// 调用处同样需要
#[cfg(target_os = "macos")]
apply_macos_rounded_corners(&window);
```

依赖也要做平台限定：

```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.6"
```

这样 Windows/Linux 编译时不会拉入 objc2，也不会编译 macOS 专有代码。

### 6. 调试建议

- macOS 无边框窗口首次运行时，用 `lsof -i TCP` 确认 dev server 已启动
- 圆角不生效时，优先检查 `wantsLayer` 是否在 `layer` 之前设置
- 拖拽不生效时，确认元素确实在 `data-tauri-drag-region` 区域内，且未被 `data-tauri-no-drag` 阻断