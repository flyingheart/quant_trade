import { useStore } from '../store';

export function TopBar() {
  const symbol = useStore((s) => s.symbol);
  const interval = useStore((s) => s.interval);
  const leftPanelCollapsed = useStore((s) => s.leftPanelCollapsed);
  const rightPanelCollapsed = useStore((s) => s.rightPanelCollapsed);
  const toggleLeftPanel = useStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useStore((s) => s.toggleRightPanel);

  return (
    <div className="h-11 bg-gradient-to-r from-[#1a1b26] to-[#1f2335] rounded-lg flex items-center px-4 justify-between border border-[#2a2d3e] flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-gradient-to-br from-[#7aa2f7] to-[#bb9af7] rounded-md flex items-center justify-center text-xs font-bold text-[#1a1b26]">
          Q
        </div>
        <h2 className="text-sm text-[#c0caf5] font-semibold">量化策略回测工具</h2>
        <span className="text-xs text-[#545c7e]">|</span>
        <span className="text-xs text-[#9aa4ce]">{symbol}</span>
        <span className="text-xs text-[#545c7e]">|</span>
        <span className="text-xs text-[#9aa4ce]">{interval}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLeftPanel}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-all text-sm ${
            leftPanelCollapsed
              ? 'bg-[#7aa2f7] text-[#1a1b26] border border-[#7aa2f7]'
              : 'bg-[#24283b] text-[#9aa4ce] border border-[#363b54] hover:bg-[#363b54] hover:text-[#c0caf5]'
          }`}
          title="参数面板"
        >
          ◧
        </button>
        <button
          onClick={toggleRightPanel}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-all text-sm ${
            rightPanelCollapsed
              ? 'bg-[#7aa2f7] text-[#1a1b26] border border-[#7aa2f7]'
              : 'bg-[#24283b] text-[#9aa4ce] border border-[#363b54] hover:bg-[#363b54] hover:text-[#c0caf5]'
          }`}
          title="策略编辑"
        >
          ◨
        </button>
      </div>
    </div>
  );
}
