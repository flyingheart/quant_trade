# M3 K线与技术指标展示模块 - 设计文档

## 概述

M3 模块实现 K 线图表界面，使用假数据填充，完成基本界面效果。暂不接入 M2 数据源。

## 技术方案

- **纯前端实现**：用随机游走算法生成模拟 K 线数据
- **图表库**：lightweight-charts（TradingView 官方）
- **布局**：按交互方案 HTML 实现完整界面

## 实现内容

### 1. 假数据生成
- 生成 1000 根日线 K 线数据（OHLCV）
- 随机游走算法，模拟真实走势
- 生成 MA5/MA10/MA20 均线数据

### 2. 图表组件
- 主图：蜡烛图 + MA 均线叠加
- 副图：成交量（Volume）
- 十字光标、悬浮详情、缩放、拖拽

### 3. 界面布局
- 顶部栏：标题 + 面板切换按钮
- 左侧面板：参数面板（占位）
- 中间区域：K 线图表
- 右侧面板：编辑器面板（占位）
- 底部区域：回测结果面板（占位）

### 4. 状态管理
- Zustand store 管理 K 线数据、面板折叠状态
- 预留回测相关状态字段

## 文件结构

```
frontend/src/
├── store/
│   └── index.ts          # Zustand store
├── types/
│   └── index.ts          # TypeScript 类型定义
├── utils/
│   └── mockData.ts       # 假数据生成器
├── components/
│   ├── Layout.tsx        # 整体布局
│   ├── TopBar.tsx        # 顶部栏
│   ├── KlineChart.tsx    # K 线图表
│   ├── LeftPanel.tsx     # 左侧参数面板
│   ├── RightPanel.tsx    # 右侧编辑器面板
│   └── BottomPanel.tsx   # 底部结果面板
├── App.tsx               # 根组件
└── main.tsx              # 入口
```

## 后续对接

- 数据源：替换 `mockData.ts` 为 Tauri IPC 调用
- 图表组件接口保持不变，只需替换数据传入
