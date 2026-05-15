import { useStore } from '../store';

export function RightPanel() {
  const strategyCode = useStore((s) => s.strategyCode);
  const setStrategyCode = useStore((s) => s.setStrategyCode);

  return (
    <div className="w-80 bg-gradient-to-b from-[#1a1b26] to-[#1f2335] rounded-lg p-3.5 overflow-y-auto border border-[#2a2d3e] transition-all flex-shrink-0">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#2a2d3e]">
        <span className="text-xs font-semibold text-[#c0caf5]">策略编辑器</span>
        <span className="text-[10px] text-[#545c7e]">JavaScript</span>
      </div>

      <div className="bg-[#0d0e15] rounded-md border border-[#2a2d3e] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1b26] border-b border-[#2a2d3e]">
          <span className="text-[10px] text-[#545c7e]">strategy.js</span>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span className="text-[10px] text-[#545c7e]">就绪</span>
          </div>
        </div>
        <textarea
          value={strategyCode}
          onChange={(e) => setStrategyCode(e.target.value)}
          className="w-full h-64 bg-[#0d0e15] text-[#c0caf5] p-3 text-xs font-mono outline-none resize-none"
          spellCheck={false}
        />
      </div>

      <div className="mt-3 bg-[#0d0e15] rounded-md border border-[#2a2d3e] p-2.5">
        <div className="text-[10px] text-[#545c7e] mb-1.5">输出日志</div>
        <div className="text-[10px] text-[#9aa4ce] font-mono h-20 overflow-y-auto">
          <div className="text-[#545c7e]">// 运行回测后显示日志</div>
        </div>
      </div>
    </div>
  );
}
