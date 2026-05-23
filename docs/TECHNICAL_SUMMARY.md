# Tauri 2 + macOS 无边框窗口：圆角 + 防白闪 完整实现

> 基于 Tauri 2 + Rust + objc2 实现真正的原生窗口圆角与无闪烁 resize。
> 适用于需要自定义标题栏、窗口圆角、透明四角的全平台桌面应用。

---

## 目录

1. [项目背景与目标](#1-项目背景与目标)
2. [整体架构](#2-整体架构)
3. [第一步：无边框窗口 + 自定义标题栏](#3-第一步无边框窗口--自定义标题栏)
4. [第二步：macOS 原生圆角裁剪 (CALayer)](#4-第二步macos-原生圆角裁剪-calayer)
5. [第三步：解决 resize 白闪 (核心难点)](#5-第三步解决-resize-白闪核心难点)
6. [第四步：macOSPrivateApi 配置](#6-第四步macosprivateapi-配置)
7. [完整代码清单](#7-完整代码清单)
8. [跨平台注意事项](#8-跨平台注意事项)
9. [关键文件结构](#9-关键文件结构)
10. [踩坑记录与设计决策](#10-踩坑记录与设计决策)

---

## 1. 项目背景与目标

### 目标

用 **Tauri 2** 构建一个桌面应用，具备：

1. **无边框窗口** — 无操作系统原生标题栏、边框、窗口按钮
2. **自定义标题栏** — 纯 HTML/CSS 实现，支持拖拽移动 + 最小化/最大化/关闭
3. **16px 圆角** — 四角**真正透明**（能看到桌面或背后窗口）
4. **resize 时不闪白** — 窗口拖拽拉伸时无白色闪烁帧

### 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri 2 |
| 后端语言 | Rust (edition 2021) |
| 前端 | HTML + CSS + JavaScript (Vanilla, Vite) |
| macOS 原生 API | `objc2` / `objc2-foundation` / `objc2-app-kit` |
| 窗口控制 JS | `@tauri-apps/api` v2 |

---

## 2. 整体架构

```
┌────────────────────────────────────────────────────────────┐
│                    NSWindow (macOS)                         │
│  backgroundColor = clearColor (透明)                        │
│  setOpaque = false                                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  contentView (NSView)                              │    │
│  │  layer.backgroundColor = #1a1a2e (深色)            │    │
│  │  layer.cornerRadius = 16                           │    │
│  │  layer.masksToBounds = true  ← 原生圆角裁剪        │    │
│  │  ┌────────────────────────────────────────────┐   │    │
│  │  │  WKWebView                                 │   │    │
│  │  │  ┌──────────────────────────────────────┐  │   │    │
│  │  │  │  <html> background: transparent      │  │   │    │
│  │  │  │  <body> background: #1a1a2e          │  │   │    │
│  │  │  │  <div data-tauri-drag-region>        │  │   │    │
│  │  │  │    自定义标题栏 + 控制按钮            │  │   │    │
│  │  │  │  </div>                              │  │   │    │
│  │  │  │  <div class="content">               │  │   │    │
│  │  │  │    应用主内容                        │  │   │    │
│  │  │  │  </div>                              │  │   │    │
│  │  │  └──────────────────────────────────────┘  │   │    │
│  │  └────────────────────────────────────────────┘   │    │
│  │                                                    │    │
│  │  ← layer.backgroundColor 深色填充内容区域 →        │    │
│  │  ← cornerRadius + masksToBounds 裁切四角 →         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ← 四角被裁切 → clearColor 透出 → 桌面/背后窗口可见        │
└────────────────────────────────────────────────────────────┘
```

### 核心数据流：窗口拉伸时

```
用户拖拽窗口边缘
  → macOS 窗口服务器分配新像素
  → contentView.CALayer 同步用 #1a1a2e 填充（~0ms，不闪白）
  → WKWebView 异步重绘（~16ms 后）
  → 深色 HTML 内容覆盖在 layer 背景之上
  → 四角 16px 处：layer 背景被裁切 → clearColor → 桌面穿透
```

---

## 3. 第一步：无边框窗口 + 自定义标题栏

### 3.1 窗口配置 (`src-tauri/tauri.conf.json`)

```json
{
  "app": {
    "windows": [
      {
        "title": "Tauri 2 Demo",
        "width": 900,
        "height": 620,
        "decorations": false,
        "transparent": true,
        "resizable": true,
        "center": true
      }
    ]
  }
}
```

| 属性 | 作用 |
|---|---|
| `decorations: false` | 移除系统原生标题栏、边框、三按钮 |
| `transparent: true` | 启用窗口 alpha 通道（CALayer 圆角裁剪的前提） |

### 3.2 自定义标题栏 HTML (`index.html`)

```html
<div class="titlebar" data-tauri-drag-region>
  <span class="titlebar-text">Tauri 2 无边框窗口</span>
  <div class="titlebar-controls">
    <button id="titlebar-minimize">─</button>
    <button id="titlebar-maximize">□</button>
    <button id="titlebar-close">✕</button>
  </div>
</div>
```

**关键属性：`data-tauri-drag-region`**  

这是 Tauri 2 内置的自定义属性。挂载该属性的元素被鼠标拖拽时，Tauri 底层自动将其转换为窗口移动事件，**无需任何 JS 拖拽逻辑**。

### 3.3 窗口控制 JS (`script.js`)

```js
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

document.getElementById("titlebar-minimize")
  ?.addEventListener("click", () => appWindow.minimize());
document.getElementById("titlebar-maximize")
  ?.addEventListener("click", () => appWindow.toggleMaximize());
document.getElementById("titlebar-close")
  ?.addEventListener("click", () => appWindow.close());
```

### 3.4 权限声明 (`src-tauri/capabilities/default.json`)

Tauri 2 的权限系统要求显式声明窗口操作权限：

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-start-dragging",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-toggle-maximize"
  ]
}
```

---

## 4. 第二步：macOS 原生圆角裁剪 (CALayer)

### 4.1 为什么不用 CSS `border-radius`？

| 方法 | 效果 | 局限性 |
|---|---|---|
| CSS `border-radius` | 只裁剪 HTML 内容 | 窗口矩形不变，裁切区露出灰色/白色窗口背景 |
| `CALayer.cornerRadius` | **原生层**裁剪整个 contentView | 需要 Objective-C runtime 访问 |

CSS `border-radius` 只在 WKWebView 内部生效，无法改变窗口形状。要**真正**让 macOS 窗口显示圆角，必须在 CALayer 层面操作。

### 4.2 Rust 实现 (`src-tauri/src/lib.rs`)

```rust
use objc2::*;

fn setup_macos_window(window: &tauri::WebviewWindow) {
    let ns_window = window.ns_window().unwrap() as *mut objc2_app_kit::NSWindow;

    unsafe {
        // --- ① NSWindow 背景完全透明 ---
        let clear_color: *mut NSColor = msg_send![class!(NSColor), clearColor];
        let _: () = msg_send![ns_window, setBackgroundColor: clear_color];
        let _: () = msg_send![ns_window, setOpaque: false];
        let _: () = msg_send![ns_window, setHasShadow: true];

        // --- ② contentView 启用 CALayer 合成 ---
        let content_view: *mut NSView = msg_send![ns_window, contentView];
        let _: () = msg_send![content_view, setWantsLayer: true];
        let layer: *mut NSObject = msg_send![content_view, layer];

        // --- ③ 设置圆角 + 越界裁剪 ---
        let _: () = msg_send![layer, setCornerRadius: 16.0f64];
        let _: () = msg_send![layer, setMasksToBounds: true];

        // --- ④ contentView layer 自身背景设深色（详见第 5 步） ---
        let dark: *mut NSColor = msg_send![class!(NSColor),
            colorWithSRGBRed: 0.102 green: 0.102 blue: 0.180 alpha: 1.0];
        let cg_color: *mut NSObject = msg_send![dark, CGColor];
        let _: () = msg_send![layer, setBackgroundColor: cg_color];

        // --- ⑤ 刷新阴影 ---
        let _: () = msg_send![ns_window, invalidateShadow];
    }
}
```

### 4.3 关键 API 解析

| API | 作用 |
|---|---|
| `nsWindow.contentView` | 获取窗口的内容视图（WKWebView 的父视图） |
| `setWantsLayer: true` | 将 contentView 变为 **layer-backed**，所有子视图通过 CALayer 合成 |
| `setCornerRadius: 16.0` | 图层四角变为 16px 圆角 |
| `setMasksToBounds: true` | 裁剪超出圆角范围的内容 |
| `setBackgroundColor:` (CALayer) | 设置图层的**背景填充色**（被 cornerRadius 裁剪） |
| `CGColor` | NSColor 的 CoreGraphics 颜色表示（CALayer 需要的类型） |
| `invalidateShadow` | 通知窗口服务器重新计算阴影，使阴影跟随圆角形状 |

### 4.4 `objc2` crate 要点

`objc2` 允许 Rust 直接调用 Objective-C runtime，无需编写 `.m` 文件或 bridging header。

```toml
# Cargo.toml — 仅 macOS 需要
[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.6"
objc2-foundation = "0.3"
objc2-app-kit = "0.3"
```

**调用模式**：

```rust
let result: ReturnType = msg_send![receiver, selector, arg1, arg2];
```

注意 `msg_send!` 的 Objective-C 关键字参数在 `objc2 0.6+` 中必须用**逗号分隔**：

```rust
// ✅ 正确
msg_send![color, colorWithSRGBRed: 0.102, green: 0.102, blue: 0.180, alpha: 1.0];

// ❌ 废弃语法（在旧版 objc 中可用）
msg_send![color, colorWithSRGBRed:0.102 green:0.102 blue:0.180 alpha:1.0];
```

---

## 5. 第三步：解决 resize 白闪 (核心难点)

这是整个实现中**最关键的挑战**，经历了 3 次迭代才找到正确答案。

### 5.1 问题根因

```
NSWindow.backgroundColor = clearColor（透明）
        ↓
resize 时 macOS 窗口服务器分配新像素
        ↓
透明窗口的默认行为：新像素填充为 白色
        ↓
WKWebView 随后异步重绘 → 深色内容覆盖
        ↓
用户看到：白色帧一闪而过
```

### 5.2 方案演进

#### ❌ 尝试 1：关闭透明窗口

```json
"transparent": false
```

**结果**：白闪消失，但**圆角也消失了**。

**原因**：`transparent: false` 让窗口使用不透明合成路径，CALayer 的 `masksToBounds` 不再裁剪出透明区域，圆角失效。

#### ❌ 尝试 2：NSWindow.backgroundColor = 深色

```rust
let dark = msg_send![NSColor, colorWithSRGBRed:0.102 green:0.102 blue:0.180 alpha:1.0];
msg_send![ns_window, setBackgroundColor: dark];
```

**结果**：resize 不闪白了（新像素直接显示深色），但**圆角也看不见了**。

**原因**：CALayer 确实在 16px 处裁切了，但被裁掉的四角露出了 NSWindow 的深色 `backgroundColor`，和内容区颜色完全一样——视觉上变成一个深色直角窗口。

```
图层堆叠：
  WKWebView (深色内容)        → 可见区域
  contentView.CALayer (16px 圆角裁切)
  NSWindow.backgroundColor (深色)  → 填满裁切区 ← 问题在这里
```

#### ✅ 尝试 3：深色背景移到 contentView 的 CALayer（最终方案）

**核心洞察**：把深色背景从 **NSWindow 级别** 移到 **contentView 的 `CALayer.backgroundColor`**。

```rust
// NSWindow 保持透明
msg_send![ns_window, setBackgroundColor: clearColor];
msg_send![ns_window, setOpaque: false];

// contentView 的 CALayer 设深色背景
let layer = msg_send![content_view, layer];
let dark = msg_send![NSColor, colorWithSRGBRed:0.102 green:0.102 blue:0.180 alpha:1.0];
let cg_color = msg_send![dark, CGColor];
msg_send![layer, setBackgroundColor: cg_color];
```

**为什么同时解决了两个问题？**

```
layer.backgroundColor = #1a1a2e (CALayer 级别，同步合成)
        ↓
Resize 时：CALayer 毫秒级填充新像素（无需等待 WebView 渲染）
        ↓
layer.cornerRadius + masksToBounds 裁剪四角
        ↓
被裁掉的区域 → 没有 layer 背景色 → clearColor → 透明 → 桌面可见
        ↓
✅ 圆角透明可见      ✅ resize 不闪白
```

**关键区别**：

| 方案 | 背景色位置 | Resize 行为 | 圆角四角 |
|---|---|---|---|
| 原始 | clearColor (无) | 闪白 | 透明 ✅ |
| 尝试 1 | `transparent: false` | 不闪 ✅ | 直角 ❌ |
| 尝试 2 | NSWindow 级别 | 不闪 ✅ | 深色填满 ❌ |
| **最终** ✅ | **contentView.CALayer 级别** | **不闪 ✅** | **透明 ✅** |

### 5.3 为什么 CALayer.backgroundColor 能防闪白？

- NSWindow 的 `backgroundColor` 是窗口级别的属性，resize 时系统用这个颜色填充新像素
- CALayer 的 `backgroundColor` 是合成器级别的属性，**在 GPU 合成时同步生效**
- WKWebView 的内容需要 **异步渲染**（JavaScript → HTML → 排版 → 绘制），通常落后 1-2 帧
- 而 CALayer 的纯色背景直接在 GPU 上合成，**零延迟**

所以层叠顺序为：

```
Resize 新像素
  → 第 0 帧：CALayer.backgroundColor = #1a1a2e（GPU 合成，立即）
  → 第 1-2 帧：WKWebView 黑色内容开始覆盖
  → 用户始终看不到白色
```

---

## 6. 第四步：macOSPrivateApi 配置

### 6.1 为什么需要？

Tauri 2 在 macOS 上使用 `transparent: true` 时，如果不启用 `macOSPrivateApi`，窗口无法获得完整的 alpha 合成支持，导致：
- CALayer 的圆角裁剪不生效
- 控制台输出警告：`The window is set to be transparent but the macos-private-api is not enabled.`

### 6.2 配置方法

**`src-tauri/tauri.conf.json`**：
```json
{
  "app": {
    "macOSPrivateApi": true
  }
}
```

**`src-tauri/Cargo.toml`**：
```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "macos-private-api"] }
```

两步缺一不可。`tauri.conf.json` 告诉 Tauri 构建系统启用该特性；`Cargo.toml` 告诉 Rust 编译器编译时包含该特性的代码。

---

## 7. 完整代码清单

### 7.1 `src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json",
  "productName": "Tauri2 Demo",
  "version": "0.1.0",
  "identifier": "com.example.tauri2-demo",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "macOSPrivateApi": true,
    "windows": [
      {
        "title": "Tauri 2 Demo",
        "width": 900,
        "height": 620,
        "decorations": false,
        "transparent": true,
        "resizable": true,
        "center": true
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

### 7.2 `src-tauri/Cargo.toml`

```toml
[package]
name = "tauri2-demo"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon", "macos-private-api"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.6"
objc2-foundation = "0.3"
objc2-app-kit = "0.3"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

### 7.3 `src-tauri/src/lib.rs`

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            use tauri::Manager;
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "windows")]
            {
                window.set_shadow(true).ok();
            }

            #[cfg(target_os = "macos")]
            setup_macos_window(&window);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "macos")]
fn setup_macos_window(window: &tauri::WebviewWindow) {
    use objc2::*;

    let ns_window = window.ns_window().unwrap() as *mut objc2_app_kit::NSWindow;

    unsafe {
        // NSWindow 背景完全透明（圆角处透出桌面）
        let color_cls = class!(NSColor);
        let clear_color: *mut objc2_app_kit::NSColor = msg_send![color_cls, clearColor];
        let _: () = msg_send![ns_window, setBackgroundColor: clear_color];
        let _: () = msg_send![ns_window, setOpaque: false];
        let _: () = msg_send![ns_window, setHasShadow: true];

        // contentView 层圆角裁剪 + 深色背景
        // 深色 layer background 同步填充 resize 新像素（不闪白）
        let content_view: *mut objc2_app_kit::NSView = msg_send![ns_window, contentView];
        let _: () = msg_send![content_view, setWantsLayer: true];
        let layer: *mut objc2_foundation::NSObject = msg_send![content_view, layer];
        let _: () = msg_send![layer, setCornerRadius: 16.0f64];
        let _: () = msg_send![layer, setMasksToBounds: true];

        // contentView layer 自身背景设深色
        let dark_ns: *mut objc2_app_kit::NSColor = msg_send![color_cls,
            colorWithSRGBRed: 0.102, green: 0.102, blue: 0.180, alpha: 1.0];
        let dark_cg: *mut objc2_foundation::NSObject = msg_send![dark_ns, CGColor];
        let _: () = msg_send![layer, setBackgroundColor: dark_cg];

        // 让阴影跟随圆角
        let _: () = msg_send![ns_window, invalidateShadow];
    }
}
```

### 7.4 `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tauri 2 Demo</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div id="app">
      <div class="titlebar" data-tauri-drag-region>
        <span class="titlebar-text">Tauri 2 无边框窗口</span>
        <div class="titlebar-controls">
          <button id="titlebar-minimize" title="最小化">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path fill="currentColor" d="M13 8H3V7h10z"/>
            </svg>
          </button>
          <button id="titlebar-maximize" title="最大化">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path fill="currentColor" d="M3 3v10h10V3zm1 1h8v8H4z"/>
            </svg>
          </button>
          <button id="titlebar-close" title="关闭">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path fill="currentColor" d="M8 7.05L4.95 4 4 4.95 7.05 8 4 11.05 4.95 12 8 8.95 11.05 12 12 11.05 8.95 8 12 4.95 11.05 4z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="content">
        <h1>无边框窗口示例</h1>
        <p>这是一个基于 Tauri 2 的无边框窗口。</p>
        <p>自定义标题栏支持拖拽移动窗口，并带有窗口控制按钮。</p>
      </div>
    </div>
    <script type="module" src="script.js"></script>
  </body>
</html>
```

### 7.5 `frontend/style.css`

```css
:root {
  --titlebar-height: 38px;
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --text-primary: #e0e0e0;
  --text-muted: #888;
  --accent: #0f3460;
  --danger: #e94560;
  --radius: 16px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  background: transparent;  /* ← 让圆角处透明 */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
  height: 100vh;
  margin: 0;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.titlebar {
  flex-shrink: 0;
  height: var(--titlebar-height);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  user-select: none;
}

.titlebar-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  pointer-events: none;
}

.titlebar-controls {
  display: flex;
  gap: 6px;
}

.titlebar-controls button {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--text-muted);
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.titlebar-controls button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

#titlebar-close:hover {
  background: var(--danger);
  color: #fff;
}

.content {
  flex: 1;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.content h1 {
  font-size: 28px;
  font-weight: 600;
}

.content p {
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 460px;
}
```

### 7.6 `frontend/script.js`

```js
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

document
  .getElementById("titlebar-minimize")
  ?.addEventListener("click", () => appWindow.minimize());

document
  .getElementById("titlebar-maximize")
  ?.addEventListener("click", () => appWindow.toggleMaximize());

document
  .getElementById("titlebar-close")
  ?.addEventListener("click", () => appWindow.close());
```

### 7.7 `src-tauri/capabilities/default.json`

```json
{
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-start-dragging",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-toggle-maximize"
  ]
}
```

---

## 8. 跨平台注意事项

### Windows

- 圆角需要 `DWMWA_WINDOW_CORNER_PREFERENCE` API（Windows 11），通过 `windows-rs` crate 调用
- 白闪可通过 `WS_EX_NOREDIRECTIONBITMAP` 样式标志解决（阻止 DWM 分配白色重定向位图）
- 当前代码中已有 `window.set_shadow(true)` 调用

```rust
#[cfg(target_os = "windows")]
{
    window.set_shadow(true).ok();
    // 如需 Windows 圆角，需额外添加 DWM API 调用
}
```

### Linux

- 取决于窗口管理器（Compositor），透明窗口支持不一
- 通常通过 `x11` 或 `wayland` crate 操作原生窗口属性

---

## 9. 关键文件结构

```
project-root/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # 程序入口
│   │   └── lib.rs            # 核心逻辑：setup + macOS 原生 API
│   ├── tauri.conf.json       # 窗口配置（decorations/transparent/macOSPrivateApi）
│   ├── Cargo.toml            # Rust 依赖（tauri + objc2）
│   └── capabilities/
│       └── default.json      # 权限声明
├── frontend/
│   ├── index.html            # 标题栏 HTML + data-tauri-drag-region
│   ├── style.css             # 深色主题样式
│   └── script.js             # 窗口控制 JS
└── package.json              # npm 依赖（@tauri-apps/api + vite）
```

---

## 10. 踩坑记录与设计决策

### 10.1 踩坑时间线

| # | 尝试 | 结果 | 原因 |
|---|---|---|---|
| 1 | `transparent: false` | 不闪白，圆角消失 | 不透明窗口不支持 CALayer alpha 裁剪 |
| 2 | NSWindow.backgroundColor = 深色 | 不闪白，圆角不可见 | 深色填满了 CALayer 裁切区 |
| 3 | 缺少 `macOSPrivateApi` | 圆角不生效 | Tauri 2 透明窗口需此 flag |
| 4 | `body::before` 固定定位伪元素 | 圆角边上出现黑色小块 | `position: fixed` 不受父级 `overflow: hidden` 约束 |
| **最终** | **contentView.CALayer.backgroundColor** | **✅ 透明圆角 + ✅ 不闪白** | 深色在 GPU 合成层，被 cornerRadius 裁剪 |

### 10.2 关键原则

1. **CALayer.backgroundColor ≠ NSWindow.backgroundColor**  
   前者是合成器级别的属性，受 `cornerRadius` 裁剪；后者是窗口级别的纯色填充，覆盖在 CALayer 之上。

2. **透明度需要多层配合**  
   `transparent: true`（配置文件）+ `setOpaque: false`（运行时）+ `html { background: transparent }`（CSS），缺一不可。

3. **原生裁剪 > CSS 裁剪**  
   `CALayer.cornerRadius + masksToBounds` 在 GPU 合成阶段裁剪，先于 WKWebView 渲染，因此 resize 时不会产生白帧。CSS `border-radius` 在 WKWebView 内部渲染后裁剪，已经太晚了。

4. **`macOSPrivateApi` 是硬性要求**  
   不加这个配置，`transparent: true` 在 macOS 上虽然"工作"（窗口透明），但无法启用完整的 alpha 合成管线，CALayer 裁剪不生效。

5. **不添加多余的 CSS 合成层**  
   `position: fixed` 等会创建独立的 GPU 合成层，与 CALayer 的 `masksToBounds` 交互时可能产生 1px 渲染瑕疵。

---

## 参考资料

- [Tauri 2 配置文档 — macOSPrivateApi](https://v2.tauri.app/reference/config/#macosprivateapi)
- [obj2 crate](https://crates.io/crates/objc2) — Rust 到 Objective-C 的零开销桥接
- [NSWindow · Apple Developer](https://developer.apple.com/documentation/appkit/nswindow)
- [CALayer · Apple Developer](https://developer.apple.com/documentation/quartzcore/calayer)
