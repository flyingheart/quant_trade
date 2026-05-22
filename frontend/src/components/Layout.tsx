import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { TopBar } from './TopBar';
import { RightPanel } from './RightPanel';
import { BottomPanel } from './BottomPanel';
import { KlineChart } from './KlineChart';
import { ChartToolbar } from './ChartToolbar';

const MIN_LEFT_WIDTH = 400;
const MIN_RIGHT_WIDTH = 400;
const DEFAULT_RIGHT_WIDTH = 600;

export function Layout() {
  const rightPanelCollapsed = useStore((s) => s.rightPanelCollapsed);
  const loadDefaultData = useStore((s) => s.loadDefaultData);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    loadDefaultData();
  }, [loadDefaultData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = rightWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const deltaX = startXRef.current - e.clientX;
      let newWidth = startWidthRef.current + deltaX;

      const maxRightWidth = containerWidth - MIN_LEFT_WIDTH;
      newWidth = Math.max(MIN_RIGHT_WIDTH, Math.min(newWidth, maxRightWidth));

      setRightWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const effectiveRightWidth = rightPanelCollapsed ? 0 : rightWidth;

  return (
    <div className="w-full h-full flex flex-col gap-2 p-3 overflow-hidden" ref={containerRef}>
      <TopBar />

      <div className="flex-1 flex gap-0 min-h-0">
        <div
          className="flex-1 flex flex-col min-h-0 pr-3"
          style={{ width: `calc(100% - ${effectiveRightWidth + 8}px)` }}
        >
          <div className="flex-1 min-h-0 bg-[#1a1b26] rounded-lg border border-[#2a2d3e] overflow-hidden flex flex-col">
            <ChartToolbar />
            <div className="flex-1 min-h-0 relative">
              <KlineChart />
            </div>
          </div>
          <div className="mt-2">
            <BottomPanel />
          </div>
        </div>

        {!rightPanelCollapsed && (
          <div
            className={`w-3 cursor-col-resize flex items-center justify-center transition-colors ${isDragging ? 'bg-[#7aa2f7]' : 'hover:bg-[#363b54]'
              }`}
            onMouseDown={handleMouseDown}
          >
            <div className="w-1.5 h-10 bg-[#545c7e] rounded-full" />
          </div>
        )}

        <div
          className="flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden pl-1"
          style={{ width: effectiveRightWidth, minWidth: effectiveRightWidth }}
        >
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
