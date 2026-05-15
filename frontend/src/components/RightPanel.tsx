import { useState } from 'react';

const TABS = [
  { key: 'code', label: '策略代码' },
  { key: 'template', label: '模板库' },
  { key: 'history', label: '历史版本' },
];

const CODE_CONTENT = `// @param ma_fast number=5 快线周期
// @param ma_slow number=20 慢线周期
// @param rsi_period number=14 RSI周期
// @param enable_stop_loss bool=true 启用止损

function run() {
  const maFast = MA(CLOSE, ma_fast);
  const maSlow = MA(CLOSE, ma_slow);
  
  // 金叉买入
  if (CROSS(maFast, maSlow)) {
    return BUY;
  }
  
  // 死叉卖出
  if (CROSS(maSlow, maFast)) {
    return SELL;
  }
  
  return HOLD;
}`;

const TEMPLATE_CONTENT = `📚 策略模板库

1. 均线交叉策略
   - 金叉买入，死叉卖出
   - 参数: 快线周期, 慢线周期

2. RSI 超买超卖
   - RSI < 30 买入, RSI > 70 卖出
   - 参数: RSI周期, 超买线, 超卖线

3. 布林带突破
   - 突破上轨卖出, 突破下轨买入
   - 参数: 周期, 标准差倍数

4. MACD 策略
   - DIF 上穿 DEA 买入
   - 参数: 快线, 慢线, 信号线

点击模板加载到编辑器`;

const HISTORY_CONTENT = `📜 历史版本

v3 (当前) - 2024-12-15 10:23
  添加止损逻辑

v2 - 2024-12-14 15:30
  调整 MA 周期 5/20

v1 - 2024-12-13 09:15
  初始版本

点击版本可回滚`;

export function RightPanel() {
  const [activeTab, setActiveTab] = useState('code');

  const content = activeTab === 'code' ? CODE_CONTENT : activeTab === 'template' ? TEMPLATE_CONTENT : HISTORY_CONTENT;

  return (
    <div className="bg-gradient-to-b from-[#1a1b26] to-[#1f2335] rounded-lg border border-[#2a2d3e] flex flex-col overflow-hidden h-full">
      <div className="flex items-center border-b border-[#2a2d3e] flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'text-[#7aa2f7] border-b-2 border-[#7aa2f7] bg-[#24283b]'
                : 'text-[#9aa4ce] hover:text-[#c0caf5]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <pre className="w-full h-full p-3 text-xs text-[#c0caf5] font-mono bg-[#0d0e15] overflow-auto whitespace-pre-wrap">
          {content}
        </pre>
      </div>
    </div>
  );
}
