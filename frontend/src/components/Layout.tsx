import { useStore } from '../store';
import { TopBar } from './TopBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { BottomPanel } from './BottomPanel';
import { KlineChart } from './KlineChart';
import { ChartToolbar } from './ChartToolbar';

export function Layout() {
  const leftPanelCollapsed = useStore((s) => s.leftPanelCollapsed);
  const rightPanelCollapsed = useStore((s) => s.rightPanelCollapsed);

  return (
    <div className="w-full h-full flex flex-col gap-2 p-3 bg-[#0d0e15]">
      <TopBar />

      <div className="flex-1 flex gap-2 min-h-0">
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
            leftPanelCollapsed ? 'w-0' : 'w-[280px]'
          }`}
          style={{ minWidth: leftPanelCollapsed ? 0 : 280 }}
        >
          <LeftPanel />
        </div>

        <div className="flex-1 flex flex-col min-h-0" style={{ minWidth: 400 }}>
          <div className="flex-1 min-h-0 bg-[#1a1b26] rounded-lg border border-[#2a2d3e] overflow-hidden flex flex-col">
            <ChartToolbar />
            <div className="flex-1 min-h-0">
              <KlineChart />
            </div>
          </div>
          <div className="mt-2">
            <BottomPanel />
          </div>
        </div>

        <div
          className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
            rightPanelCollapsed ? 'w-0' : 'w-[360px]'
          }`}
          style={{ minWidth: rightPanelCollapsed ? 0 : 360 }}
        >
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
