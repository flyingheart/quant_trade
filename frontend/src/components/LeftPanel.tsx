import { useState } from 'react';
import { useStore } from '../store';

export function LeftPanel() {
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
    <div className="bg-gradient-to-b from-surface to-elevated rounded-lg p-3.5 overflow-y-auto border border-border transition-all">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
        <span className="text-xs font-semibold text-primary">参数配置</span>
        <span className="text-[10px] bg-accent text-deep px-1.5 py-0.5 rounded-full font-semibold">
          Auto-UI
        </span>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="text-[11px] text-secondary mb-1 block">交易标的</label>
          <select className="w-full bg-deep text-primary border border-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-accent transition-colors">
            <option>贵州茅台 (600519)</option>
            <option>腾讯控股 (00700)</option>
            <option>Apple (AAPL)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-secondary mb-1 block">初始资金</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={1000000}
              className="flex-1 bg-deep text-primary border border-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-accent transition-colors"
            />
            <span className="text-[10px] text-muted">CNY</span>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-secondary mb-1 block">手续费率</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={0.0003}
              step={0.0001}
              className="flex-1 bg-deep text-primary border border-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-accent transition-colors"
            />
            <span className="text-[10px] text-muted">单边</span>
          </div>
        </div>

        <div className="h-px bg-border my-2.5" />

        <div>
          <div className="flex items-center justify-between text-[11px] text-secondary mb-1">
            <span>MA 快线周期</span>
            <span className="text-[10px] text-muted">5-50</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={5}
              max={50}
              defaultValue={5}
              onInput={(e) => updateParam('maFast', parseInt((e.target as HTMLInputElement).value))}
              className="flex-1 accent-accent"
            />
            <span className="min-w-[28px] text-right text-xs text-primary font-medium">
              {strategyParams.maFast as number}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-secondary mb-1">
            <span>MA 慢线周期</span>
            <span className="text-[10px] text-muted">10-200</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={200}
              defaultValue={20}
              onInput={(e) => updateParam('maSlow', parseInt((e.target as HTMLInputElement).value))}
              className="flex-1 accent-accent"
            />
            <span className="min-w-[28px] text-right text-xs text-primary font-medium">
              {strategyParams.maSlow as number}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-secondary mb-1">
            <span>RSI 周期</span>
            <span className="text-[10px] text-muted">6-30</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={6}
              max={30}
              defaultValue={14}
              onInput={(e) => updateParam('rsi', parseInt((e.target as HTMLInputElement).value))}
              className="flex-1 accent-accent"
            />
            <span className="min-w-[28px] text-right text-xs text-primary font-medium">
              {strategyParams.rsi as number}
            </span>
          </div>
        </div>

        <div className="h-px bg-[#2a2d3e] my-2.5" />

        <div className="flex items-center justify-between py-1.5">
          <span className="text-[11px] text-secondary">启用止损</span>
          <div
            onClick={() => setEnableStopLoss(!enableStopLoss)}
            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
              enableStopLoss ? 'bg-accent' : 'bg-border'
            }`}
          >
            <div
              className={`w-4 h-4 bg-primary rounded-full absolute top-0.5 transition-transform ${
                enableStopLoss ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-[11px] text-secondary">启用止盈</span>
          <div
            onClick={() => setEnableTakeProfit(!enableTakeProfit)}
            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
              enableTakeProfit ? 'bg-accent' : 'bg-border'
            }`}
          >
            <div
              className={`w-4 h-4 bg-primary rounded-full absolute top-0.5 transition-transform ${
                enableTakeProfit ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-secondary mb-1 block">止损比例</label>
          <input
            type="number"
            value={stopLossRatio}
            onChange={(e) => setStopLossRatio(parseFloat(e.target.value))}
            step={0.01}
            className="w-full bg-deep text-primary border border-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="h-px bg-[#2a2d3e] my-2.5" />

        <div className="space-y-2">
          <button
            onClick={runBacktest}
            disabled={isRunning}
            className={`w-full py-2 rounded-md text-xs font-semibold transition-all ${
              isRunning
                ? 'bg-muted text-secondary cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-accent to-accent-hover text-deep hover:translate-y-[-1px] hover:shadow-[0_4px_12px_var(--accent-glow)]'
            }`}
          >
            {isRunning ? '⏳ 回测中...' : '▶ 运行回测'}
          </button>

          {isRunning && (
            <div className="mt-2.5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-secondary">回测进行中...</span>
                <span className="text-[11px] text-accent font-semibold">{progress}%</span>
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {isRunning && (
            <button
              onClick={handleCancel}
              className="w-full py-1.5 rounded-md text-[11px] font-semibold bg-transparent text-error border border-error hover:bg-error hover:text-surface transition-all"
            >
              取消回测
            </button>
          )}

          <button
            onClick={resetParams}
            className="w-full py-2 rounded-md text-xs font-semibold bg-subtle text-primary border border-hover hover:bg-hover transition-all"
          >
            ↺ 重置参数
          </button>

          <button className="w-full py-2 rounded-md text-xs font-semibold bg-subtle text-primary border border-hover hover:bg-hover transition-all">
            💾 保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
