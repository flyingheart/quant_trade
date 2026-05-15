# AGENTS.md - 量化回测工具工作流程规范

## 开发流程

1. **编码前必读**：写代码前必须先读取以下文档：
   - `./docs/项目进度管理.md`
   - `./docs/产品需求.md`
   - `./docs/技术方案.md`
   - `./docs/交互方案.html`

2. **严格按指令开发**：严格按照指令开发，不得进行额外的任务，务必扎实，不贪多。

3. **测试与归档**：开发任务结束后，等待运行测试通过后，更新 `./docs/项目进度管理.md`，并用 git 备份存档。

## 技术栈

- **架构**: Tauri 2.0 + Rust + React 18
- **后端**: Rust (Tokio, Polars, deno_core, DuckDB)
- **前端**: React 18, Zustand, lightweight-charts, Monaco Editor, TailwindCSS
- **目标平台**: Windows 10+ / macOS 11+
- **支持架构**: x86_64 / ARM64 (Apple Silicon)

## 代码规范

- 缩进 2 空格
- 变量小驼峰、类/组件大驼峰、常量大写下划线
- 最小修改原则，不破坏正常业务
- 关键逻辑/函数加简洁中文注释
- Rust 强制类型注解，TS 强制类型注解
- 优先使用 thiserror 自定义错误类型，anyhow 处理应用层错误
- 避免 unsafe 代码，除非绝对必要

## 项目结构

```
quant_trade/
├── src/                    # Rust 后端
│   ├── main.rs
│   ├── commands/          # Tauri 命令
│   ├── data/              # 数据模块
│   ├── sandbox/           # JS 沙箱
│   ├── engine/            # 回测引擎
│   └── errors/            # 错误处理
├── src-tauri/             # Tauri 配置
├── frontend/              # React 前端
│   └── src/
│       ├── store/         # Zustand 状态管理
│       ├── components/    # UI 组件
│       ├── hooks/         # 自定义 Hooks
│       └── types/         # TypeScript 类型
└── docs/                  # 文档
    ├── 产品需求.md
    ├── 技术方案.md
    ├── 交互方案.html
    └── 项目进度管理.md
```
