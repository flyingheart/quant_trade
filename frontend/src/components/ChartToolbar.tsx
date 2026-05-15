import { useState } from 'react';

const INTERVALS = ['1分', '5分', '15分', '1时', '日线'];
const INDICATORS = ['MA', 'BOLL', '指标'];

export function ChartToolbar() {
  const [activeInterval, setActiveInterval] = useState('日线');
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null);

  return (
    <div className="h-10 bg-[#1a1b26] rounded-t-lg flex items-center px-4 justify-between border-b border-[#2a2d3e] flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold text-[#c0caf5]">贵州茅台 (600519)</span>
        <span className="text-[11px] text-[#9aa4ce]">{activeInterval}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {INTERVALS.map((interval) => (
          <button
            key={interval}
            onClick={() => setActiveInterval(interval)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              activeInterval === interval
                ? 'bg-[#7aa2f7] text-[#1a1b26]'
                : 'bg-[#24283b] text-[#9aa4ce] hover:bg-[#363b54]'
            }`}
          >
            {interval}
          </button>
        ))}
        <div className="w-px h-4 bg-[#2a2d3e] mx-1" />
        {INDICATORS.map((indicator) => (
          <button
            key={indicator}
            onClick={() => setActiveIndicator(activeIndicator === indicator ? null : indicator)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              activeIndicator === indicator
                ? 'bg-[#7aa2f7] text-[#1a1b26]'
                : 'bg-[#24283b] text-[#9aa4ce] hover:bg-[#363b54]'
            }`}
          >
            {indicator}
          </button>
        ))}
      </div>
    </div>
  );
}
