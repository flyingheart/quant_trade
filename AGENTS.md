# AGENTS.md — 量化回测工具工作流程规范

> 本文档定义项目开发规范与工作流程，所有开发任务需严格遵循。

***

## 📋 开发流程

### 1. 编码前必读

编写代码前，须先阅读以下文档：

| 文档   | 路径                 | 说明          |
| ---- | ------------------ | ----------- |
| 项目进度 | `./docs/项目进度管理.md` | 当前开发进度与任务状态 |

### 2. 开发原则

- **严格按指令开发**：不执行额外任务，不贪多
- **最小修改原则**：不破坏正常业务逻辑
- **扎实交付**：确保代码质量，不遗留隐患

### 3. 测试与归档

- 开发完成后，等待测试通过
- 更新 `./docs/项目进度管理.md`
- 使用 git 备份存档

***

## 🛠 技术栈

### 整体架构

**Tauri 2.0 + Rust + React 18**（前后端不分离，内存级通信）

### 后端技术

| 类别    | 技术                 |
| ----- | ------------------ |
| 框架    | Tauri 2.0          |
| 异步运行时 | Tokio              |
| 数据计算  | Polars（向量化）        |
| JS 沙箱 | deno\_core         |
| 本地存储  | DuckDB             |
| 错误处理  | thiserror + anyhow |

### 前端技术

| 类别    | 技术                              |
| ----- | ------------------------------- |
| 框架    | React 18                        |
| 状态管理  | Zustand                         |
| 图表库   | lightweight-charts（TradingView） |
| 代码编辑器 | Monaco Editor                   |
| 样式方案  | TailwindCSS                     |

### 目标平台

- **操作系统**：Windows 10+ / macOS 11+
- **CPU 架构**：x86\_64 / ARM64（Apple Silicon）

***

## 📝 代码规范

### 基础规范

| 规范项    | 要求                 |
| ------ | ------------------ |
| 缩进     | 2 空格               |
| 变量命名   | 小驼峰（`maFast`）      |
| 类/组件命名 | 大驼峰（`KlineChart`）  |
| 常量命名   | 大写下划线（`MAX_RETRY`） |

### Rust 规范

- 强制类型注解
- 优先使用 `thiserror` 自定义错误类型
- 使用 `anyhow` 处理应用层错误
- 避免 `unsafe` 代码，除非绝对必要
- 关键逻辑/函数添加简洁中文注释

### TypeScript 规范

- 强制类型注解
- 优先使用函数组件 + Hooks
- 组件文件使用 PascalCase 命名

***

## 📁 项目结构

```
quant_trade/
├── src/                          # Rust 后端
│   ├── main.rs                   # 入口文件
│   ├── commands/                 # Tauri 命令
│   ├── data/                     # 数据模块
│   ├── sandbox/                  # JS 沙箱
│   ├── engine/                   # 回测引擎
│   └── errors/                   # 错误处理
│
├── src-tauri/                    # Tauri 配置
│
├── frontend/                     # React 前端
│   └── src/
│       ├── store/                # Zustand 状态管理
│       ├── components/           # UI 组件
│       ├── hooks/                # 自定义 Hooks
│       └── types/                # TypeScript 类型
│
└── docs/                         # 项目文档
    ├── 产品需求.md
    ├── 技术方案.md
    ├── 交互方案.html
    └── 项目进度管理.md
```

***

## 🪟 无边框窗口实现架构

Tauri 2.0 无边框窗口采用**三层架构**：

| 层 | 职责 | 关键文件 |
|----|------|----------|
| 配置层 | `tauri.conf.json` 关闭原生装饰 + 透明背景 | `src-tauri/tauri.conf.json` |
| 前端层 | 自定义标题栏 + `data-tauri-drag-region` 拖拽 | `frontend/src/components/TopBar.tsx` |
| 后端层 | macOS CALayer 圆角裁切 (objc2) / Windows 阴影 | `src-tauri/src/lib.rs` |

### 关键机制

- **拖拽区域**：`data-tauri-drag-region` 声明可拖拽区，`data-tauri-no-drag` 阻止事件穿透
- **窗口状态**：`getCurrentWindow().isMaximized()` + `onResized` 监听，控制最大化/还原图标切换
- **控制按钮**：最小化/最大化还原/关闭，SVG 图标配色 `#f7768e`(红)/`#9aa4ce`(灰)
- **平台差异**：macOS 通过 `objc2` 操作 NSView CALayer 裁切 16px 圆角；Windows 调用 `set_shadow(true)` 保留阴影
- **背景保护**：前端 `index.css` 设 `border-radius: 16px` + `background: transparent`；`index.html` 设深色背景防闪烁

### 实现要点

- `decorations: false` + `transparent: true` 配合，缺一不可
- CSS 圆角仅裁切 webview 内容；macOS 必须用原生 CALayer 裁切窗口层，否则四角露白
- `ns_window()` 需在 `setup` 回调中调用（窗口已初始化），过早调用获取不到指针
- `user-select: none` 全局禁止选中，仅 `input/textarea/select` 恢复（`user-select: auto`）
- 用户禁止选中需要在 CSS 也禁止，否则标题双击会选中文字
- `@tauri-apps/api` 前端依赖 + 窗口操作权限声明缺一不可

***

## 📝 代码优化记录

### 2026-05-22 - 代码质量优化

| 序号 | 优化项 | 优先级 | 文件 | 说明 |
|------|--------|--------|------|------|
| 1 | 数据库路径硬编码修复 | 高 | `src-tauri/src/lib.rs` | 使用 Tauri 应用数据目录存储数据库，避免权限和跨平台问题 |
| 2 | K线数据排序修复 | 高 | `frontend/src/components/KlineChart.tsx` | 使用 Date 对象比较时间，替代字符串 localeCompare |
| 3 | MA计算算法优化 | 中 | `frontend/src/utils/mockData.ts` | 滑动窗口优化，从 O(n*p) 降为 O(n) |
| 4 | 内存泄漏修复 | 中 | `frontend/src/components/KlineChart.tsx` | 正确清理 ResizeObserver 和 chart 实例 |
| 5 | Tokio依赖优化 | 低 | `src-tauri/Cargo.toml` | 仅启用必要特性，减小二进制体积 |
| 6 | 代码重复抽取 | 低 | `frontend/src/store/index.ts` | 抽取 `fetchAndProcessKlines` 辅助函数 |

### 后端优化要点
- 应用数据目录使用 `app.path().app_data_dir()` 获取
- 确保目录存在后再创建数据库文件

### 前端优化要点
- 所有时间排序使用 Date 对象转换
- 滑动窗口算法适用于大量数据场景
- 组件卸载时必须清理所有订阅和观察者


