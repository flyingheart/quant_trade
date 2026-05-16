import { useState } from 'react';
import { useStore } from '../store';

const INTERVALS = ['5分', '15分', '30分', '日线'];
const INDICATORS = ['MA', 'BOLL', '指标'];

// 股票代码到名称的映射
const SYMBOL_MAP: Record<string, string> = {
  'sh000001': '上证指数',
  'sh000002': 'A股指数',
  'sh000300': '沪深300',
  'sh600519': '贵州茅台',
  'sz000001': '平安银行',
};

// 格式化股票代码：sh000001 → 000001.SH, sz000001 → 000001.SZ
function formatSymbol(code: string): string {
  if (code.length < 8) return code;
  const prefix = code.slice(0, 2);
  const suffix = prefix === 'sh' ? 'SH' : prefix === 'sz' ? 'SZ' : prefix.toUpperCase();
  const num = code.slice(2);
  return `${num}.${suffix}`;
}

export function ChartToolbar() {
  const [activeInterval, setActiveInterval] = useState('日线');
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null);
  const symbol = useStore((s) => s.symbol);

  const getStockName = (code: string) => {
    return SYMBOL_MAP[code] || code;
  };

  return (
    <div className="h-10 bg-[#1a1b26] rounded-t-lg flex items-center px-4 justify-between border-b border-[#2a2d3e] flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold text-[#c0caf5]">{getStockName(symbol)} ({formatSymbol(symbol)})</span>
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