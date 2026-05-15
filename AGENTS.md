# AGENTS.md — 量化回测工具工作流程规范

> 本文档定义项目开发规范与工作流程，所有开发任务需严格遵循。

---

## 📋 开发流程

### 1. 编码前必读

编写代码前，必须先阅读以下文档：

| 文档 | 路径 | 说明 |
|------|------|------|
| 项目进度 | `./docs/项目进度管理.md` | 当前开发进度与任务状态 |
| 产品需求 | `./docs/产品需求.md` | 功能需求与业务逻辑 |
| 技术方案 | `./docs/技术方案.md` | 架构设计与技术实现 |
| 交互方案 | `./docs/交互方案.html` | UI 设计与交互规范 |

### 2. 开发原则

- **严格按指令开发**：不执行额外任务，不贪多
- **最小修改原则**：不破坏正常业务逻辑
- **扎实交付**：确保代码质量，不遗留隐患

### 3. 测试与归档

- 开发完成后，等待测试通过
- 更新 `./docs/项目进度管理.md`
- 使用 git 备份存档

---

## 🛠 技术栈

### 整体架构

**Tauri 2.0 + Rust + React 18**（前后端不分离，内存级通信）

### 后端技术

| 类别 | 技术 |
|------|------|
| 框架 | Tauri 2.0 |
| 异步运行时 | Tokio |
| 数据计算 | Polars（向量化） |
| JS 沙箱 | deno_core |
| 本地存储 | DuckDB |
| 错误处理 | thiserror + anyhow |

### 前端技术

| 类别 | 技术 |
|------|------|
| 框架 | React 18 |
| 状态管理 | Zustand |
| 图表库 | lightweight-charts（TradingView） |
| 代码编辑器 | Monaco Editor |
| 样式方案 | TailwindCSS |

### 目标平台

- **操作系统**：Windows 10+ / macOS 11+
- **CPU 架构**：x86_64 / ARM64（Apple Silicon）

---

## 📝 代码规范

### 基础规范

| 规范项 | 要求 |
|--------|------|
| 缩进 | 2 空格 |
| 变量命名 | 小驼峰（`maFast`） |
| 类/组件命名 | 大驼峰（`KlineChart`） |
| 常量命名 | 大写下划线（`MAX_RETRY`） |

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

---

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
