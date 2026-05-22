import { useState } from 'react';
import { useStore } from '../store';

const TABS = [
  { key: 'params', label: '参数配置' },
  { key: 'code', label: '策略代码' },
  { key: 'template', label: '模板库' },
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

function ParamsTab() {
  const strategyParams = useStore((s) => s.strategyParams);
  const updateParam = useStore((s) => s.updateParam);
  const runBacktest = useStore((s) => s.runBacktest);
  const resetParams = useStore((s) => s.resetParams);
  const isRunning = useStore((s) => s.isRunning);
  const progress = useStore((s) => s.progress);
  const [enableStopLoss, setEnableStopLoss] = useState(true);
  const [enableTakeProfit, setEnableTakeProfit] = useState(false);
  const [stopLossRatio, setStopLossRatio] = useState(0.05);

  const handleCancel = () => {
    // 取消回测逻辑
  };

  return (
    <div className="h-full overflow-y-auto p-3.5">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#2a2d3e]">
        <span className="text-xs font-semibold text-[#c0caf5]">参数配置</span>
        <span className="text-[10px] bg-[#7aa2f7] text-[#1a1b26] px-1.5 py-0.5 rounded-full font-semibold">
          Auto-UI
        </span>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="text-[11px] text-[#9aa4ce] mb-1 block">交易标的</label>
          <select className="w-full bg-[#0d0e15] text-[#c0caf5] border border-[#2a2d3e] rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-[#7aa2f7] transition-colors">
            <option>贵州茅台 (600519)</option>
            <option>腾讯控股 (00700)</option>
            <option>Apple (AAPL)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-[#9aa4ce] mb-1 block">初始资金</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={1000000}
              className="flex-1 bg-[#0d0e15] text-[#c0caf5] border border-[#2a2d3e] rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-[#7aa2f7] transition-colors"
            />
            <span className="text-[10px] text-[#545c7e]">CNY</span>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[#9aa4ce] mb-1 block">手续费率</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={0.0003}
              step={0.0001}
              className="flex-1 bg-[#0d0e15] text-[#c0caf5] border border-[#2a2d3e] rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-[#7aa2f7] transition-colors"
            />
            <span className="text-[10px] text-[#545c7e]">单边</span>
          </div>
        </div>

        <div className="h-px bg-[#2a2d3e] my-2.5" />

        <div>
          <div className="flex items-center justify-between text-[11px] text-[#9aa4ce] mb-1">
            <span>MA 快线周期</span>
            <span className="text-[10px] text-[#545c7e]">5-50</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={5}
              max={50}
              defaultValue={5}
              onInput={(e) => updateParam('maFast', parseInt((e.target as HTMLInputElement).value))}
              className="flex-1 accent-[#7aa2f7]"
            />
            <span className="min-w-[28px] text-right text-xs text-[#c0caf5] font-medium">
              {strategyParams.maFast as number}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-[#9aa4ce] mb-1">
            <span>MA 慢线周期</span>
            <span className="text-[10px] text-[#545c7e]">10-200</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={200}
              defaultValue={20}
              onInput={(e) => updateParam('maSlow', parseInt((e.target as HTMLInputElement).value))}
              className="flex-1 accent-[#7aa2f7]"
            />
            <span className="min-w-[28px] text-right text-xs text-[#c0caf5] font-medium">
              {strategyParams.maSlow as number}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-[#9aa4ce] mb-1">
            <span>RSI 周期</span>
            <span className="text-[10px] text-[#545c7e]">6-30</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={6}
              max={30}
              defaultValue={14}
              onInput={(e) => updateParam('rsi', parseInt((e.target as HTMLInputElement).value))}
              className="flex-1 accent-[#7aa2f7]"
            />
            <span className="min-w-[28px] text-right text-xs text-[#c0caf5] font-medium">
              {strategyParams.rsi as number}
            </span>
          </div>
        </div>

        <div className="h-px bg-[#2a2d3e] my-2.5" />

        <div className="flex items-center justify-between py-1.5">
          <span className="text-[11px] text-[#9aa4ce]">启用止损</span>
          <div
            onClick={() => setEnableStopLoss(!enableStopLoss)}
            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${enableStopLoss ? 'bg-[#7aa2f7]' : 'bg-[#2a2d3e]'
              }`}
          >
            <div
              className={`w-4 h-4 bg-[#c0caf5] rounded-full absolute top-0.5 transition-transform ${enableStopLoss ? 'translate-x-4' : 'translate-x-0.5'
                }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-[11px] text-[#9aa4ce]">启用止盈</span>
          <div
            onClick={() => setEnableTakeProfit(!enableTakeProfit)}
            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${enableTakeProfit ? 'bg-[#7aa2f7]' : 'bg-[#2a2d3e]'
              }`}
          >
            <div
              className={`w-4 h-4 bg-[#c0caf5] rounded-full absolute top-0.5 transition-transform ${enableTakeProfit ? 'translate-x-4' : 'translate-x-0.5'
                }`}
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[#9aa4ce] mb-1 block">止损比例</label>
          <input
            type="number"
            value={stopLossRatio}
            onChange={(e) => setStopLossRatio(parseFloat(e.target.value))}
            step={0.01}
            className="w-full bg-[#0d0e15] text-[#c0caf5] border border-[#2a2d3e] rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-[#7aa2f7] transition-colors"
          />
        </div>

        <div className="h-px bg-[#2a2d3e] my-2.5" />

        <div className="space-y-2">
          <button
            onClick={runBacktest}
            disabled={isRunning}
            className={`w-full py-2 rounded-md text-xs font-semibold transition-all ${isRunning
                ? 'bg-[#545c7e] text-[#9aa4ce] cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-[#7aa2f7] to-[#5d87e5] text-[#1a1b26] hover:translate-y-[-1px] hover:shadow-[0_4px_12px_rgba(122,162,247,0.3)]'
              }`}
          >
            {isRunning ? '⏳ 回测中...' : '▶ 运行回测'}
          </button>

          {isRunning && (
            <div className="mt-2.5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-[#9aa4ce]">回测进行中...</span>
                <span className="text-[11px] text-[#7aa2f7] font-semibold">{progress}%</span>
              </div>
              <div className="h-1 bg-[#2a2d3e] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7aa2f7] to-[#bb9af7] rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {isRunning && (
            <button
              onClick={handleCancel}
              className="w-full py-1.5 rounded-md text-[11px] font-semibold bg-transparent text-[#f7768e] border border-[#f7768e] hover:bg-[#f7768e] hover:text-[#1a1b26] transition-all"
            >
              取消回测
            </button>
          )}

          <button
            onClick={resetParams}
            className="w-full py-2 rounded-md text-xs font-semibold bg-[#24283b] text-[#c0caf5] border border-[#363b54] hover:bg-[#363b54] transition-all"
          >
            ↺ 重置参数
          </button>

          <button className="w-full py-2 rounded-md text-xs font-semibold bg-[#24283b] text-[#c0caf5] border border-[#363b54] hover:bg-[#363b54] transition-all">
            💾 保存配置
          </button>
        </div>
      </div>
    </div>
  );
}

export function RightPanel() {
  const [activeTab, setActiveTab] = useState('params');
  const strategyCode = useStore((s) => s.strategyCode);
  const setStrategyCode = useStore((s) => s.setStrategyCode);

  return (
    <div className="bg-gradient-to-b from-[#1a1b26] to-[#1f2335] rounded-lg border border-[#2a2d3e] flex flex-col overflow-hidden h-full">
      <div className="flex items-center border-b border-[#2a2d3e] flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-all ${activeTab === tab.key
                ? 'text-[#7aa2f7] border-b-2 border-[#7aa2f7] bg-[#24283b]'
                : 'text-[#9aa4ce] hover:text-[#c0caf5]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'code' && (
          <textarea
            value={strategyCode}
            onChange={(e) => setStrategyCode(e.target.value)}
            className="w-full h-full p-3 text-xs text-[#c0caf5] font-mono bg-[#0d0e15] overflow-auto whitespace-pre-wrap resize-none outline-none focus:ring-1 focus:ring-[#7aa2f7] border-0"
            spellCheck={false}
          />
        )}
        {activeTab === 'template' && (
          <pre className="w-full h-full p-3 text-xs text-[#c0caf5] font-mono bg-[#0d0e15] overflow-auto whitespace-pre-wrap">
            {TEMPLATE_CONTENT}
          </pre>
        )}
        {activeTab === 'params' && <ParamsTab />}
      </div>
    </div>
  );
}
