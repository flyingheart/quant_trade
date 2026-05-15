import { useStore } from '../store';
import { TopBar } from './TopBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { BottomPanel } from './BottomPanel';
import { KlineChart } from './KlineChart';

export function Layout() {
  const leftPanelCollapsed = useStore((s) => s.leftPanelCollapsed);
  const rightPanelCollapsed = useStore((s) => s.rightPanelCollapsed);

  return (
    <div className="w-full h-full flex flex-col gap-2 p-3 bg-[#0d0e15]">
      <TopBar />

      <div className="flex-1 flex gap-2 min-h-0">
        {!leftPanelCollapsed && <LeftPanel />}

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 bg-[#1a1b26] rounded-lg border border-[#2a2d3e] overflow-hidden">
            <KlineChart />
          </div>
          <div className="mt-2">
            <BottomPanel />
          </div>
        </div>

        {!rightPanelCollapsed && <RightPanel />}
      </div>
    </div>
  );
}
