import { useStore } from '../store';

export function LeftPanel() {
  const symbol = useStore((s) => s.symbol);
  const interval = useStore((s) => s.interval);
  const strategyParams = useStore((s) => s.strategyParams);
  const updateParam = useStore((s) => s.updateParam);
  const runBacktest = useStore((s) => s.runBacktest);
  const resetParams = useStore((s) => s.resetParams);
  const isRunning = useStore((s) => s.isRunning);
  const progress = useStore((s) => s.progress);

  return (
    <div className="w-72 bg-gradient-to-b from-[#1a1b26] to-[#1f2335] rounded-lg p-3.5 overflow-y-auto border border-[#2a2d3e] transition-all flex-shrink-0">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#2a2d3e]">
        <span className="text-xs font-semibold text-[#c0caf5]">参数设置</span>
        <span className="text-[10px] bg-[#7aa2f7] text-[#1a1b26] px-1.5 py-0.5 rounded-full font-semibold">
          Auto-UI
        </span>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="text-[11px] text-[#9aa4ce] mb-1 block">标的代码</label>
          <input
            type="text"
            value={symbol}
            readOnly
            className="w-full bg-[#0d0e15] text-[#c0caf5] border border-[#2a2d3e] rounded-md px-2.5 py-1.5 text-xs outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] text-[#9aa4ce] mb-1 block">周期</label>
          <select
            value={interval}
            className="w-full bg-[#0d0e15] text-[#c0caf5] border border-[#2a2d3e] rounded-md px-2.5 py-1.5 text-xs outline-none"
          >
            <option value="1d">日线</option>
            <option value="4h">4小时</option>
            <option value="1h">1小时</option>
            <option value="15m">15分钟</option>
            <option value="5m">5分钟</option>
            <option value="1m">1分钟</option>
          </select>
        </div>

        <div className="pt-2 border-t border-[#2a2d3e]">
          <div className="text-[11px] text-[#9aa4ce] mb-2">策略参数</div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] text-[#545c7e] mb-1">
                <span>MA 快线</span>
                <span>{strategyParams.maFast as number}</span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                value={strategyParams.maFast as number}
                onChange={(e) => updateParam('maFast', parseInt(e.target.value))}
                className="w-full accent-[#7aa2f7]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-[#545c7e] mb-1">
                <span>MA 慢线</span>
                <span>{strategyParams.maSlow as number}</span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                value={strategyParams.maSlow as number}
                onChange={(e) => updateParam('maSlow', parseInt(e.target.value))}
                className="w-full accent-[#7aa2f7]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-[#545c7e] mb-1">
                <span>RSI 周期</span>
                <span>{strategyParams.rsi as number}</span>
              </div>
              <input
                type="range"
                min={6}
                max={30}
                value={strategyParams.rsi as number}
                onChange={(e) => updateParam('rsi', parseInt(e.target.value))}
                className="w-full accent-[#7aa2f7]"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#2a2d3e] space-y-2">
          <button
            onClick={runBacktest}
            disabled={isRunning}
            className={`w-full py-2 rounded-md text-xs font-semibold transition-all ${
              isRunning
                ? 'bg-[#545c7e] text-[#9aa4ce] cursor-not-allowed'
                : 'bg-[#7aa2f7] text-[#1a1b26] hover:bg-[#89b4fa]'
            }`}
          >
            {isRunning ? `回测中 ${progress}%` : '运行回测'}
          </button>
          <button
            onClick={resetParams}
            className="w-full py-2 rounded-md text-xs font-semibold bg-[#24283b] text-[#9aa4ce] border border-[#363b54] hover:bg-[#363b54] hover:text-[#c0caf5] transition-all"
          >
            重置参数
          </button>
        </div>

        {isRunning && (
          <div className="w-full bg-[#0d0e15] rounded-full h-1.5 mt-2">
            <div
              className="bg-[#7aa2f7] h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
