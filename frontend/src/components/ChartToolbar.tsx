import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { getStockName, getStockNameWithCode } from '../api/stockNames';

const INTERVALS = ['5分', '15分', '30分', '日线'];
const INDICATORS = ['MA', 'BOLL', '指标'];

// 预设指数（仅保留大盘指数）
const PRESET_SYMBOLS = [
  { code: 'sh000001', name: '上证指数' },
  { code: 'sh000300', name: '沪深300' },
  { code: 'sh000688', name: '科创50' },
  { code: 'sz399001', name: '深证成指' },
  { code: 'sz399006', name: '创业板指' },
];

// 格式化代码：sh000001 → 000001.SH
function formatSymbol(code: string): string {
  if (code.length < 8) return code;
  const prefix = code.slice(0, 2);
  const suffix = prefix === 'sh' ? 'SH' : prefix === 'sz' ? 'SZ' : prefix.toUpperCase();
  const num = code.slice(2);
  return `${num}.${suffix}`;
}

// 补全股票代码前缀：600519 → sh600519，000001 → sz000001
function normalizeSymbol(input: string): string {
  const s = input.trim().toLowerCase().replace(/[^0-9a-z]/g, '');
  // 已带 sh/sz 前缀
  if (/^(sh|sz)\d{6}$/.test(s)) return s;
  // 纯数字
  if (/^\d{6}$/.test(s)) {
    if (s.startsWith('6') || s.startsWith('5') || s === '000001' || s === '000002' || s === '000300' || s === '000688') {
      return 'sh' + s;
    }
    return 'sz' + s;
  }
  // 可能新三板 4/8 开头或者纯英文
  return s;
}

const PRESET_CODES = new Set(PRESET_SYMBOLS.map((s) => s.code));

export function ChartToolbar() {
  const [activeInterval, setActiveInterval] = useState('日线');
  const [activeIndicator, setActiveIndicator] = useState<string | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const symbol = useStore((s) => s.symbol);
  const history = useStore((s) => s.history);
  const loadSymbolData = useStore((s) => s.loadSymbolData);
  const addHistory = useStore((s) => s.addHistory);

  const displayName = `${getStockName(symbol) || getStockNameWithCode(symbol)} (${formatSymbol(symbol)})`;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setSelectOpen(false);
        setInputValue('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 打开时聚焦输入框
  useEffect(() => {
    if (selectOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectOpen]);

  function handleSelect(code: string) {
    const name = getStockName(code) || getStockNameWithCode(code);
    loadSymbolData(code);
    addHistory({ code, name });
    setSelectOpen(false);
    setInputValue('');
  }

  function handleSearch() {
    const raw = inputValue.trim();
    if (!raw) return;
    const code = normalizeSymbol(raw);
    if (!/^(sh|sz)\d{6}$/.test(code) && !/^[a-z]+\d+$/.test(code)) return;
    const name = getStockName(code) || getStockNameWithCode(code);
    loadSymbolData(code);
    addHistory({ code, name });
    setSelectOpen(false);
    setInputValue('');
  }

  function handleInputKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  // 预设指数永远置顶，历史记录在后，用分割线隔开
  const histItems = history.filter((h) => !PRESET_CODES.has(h.code)).slice(0, 50);

  return (
    <div className="h-10 bg-[#1a1b26] rounded-t-lg flex items-center px-4 justify-between border-b border-[#2a2d3e] flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="relative" ref={selectRef}>
          <button
            onClick={() => setSelectOpen(!selectOpen)}
            className="text-[13px] font-semibold text-[#c0caf5] flex items-center gap-1.5 hover:text-[#7aa2f7] transition-colors"
          >
            {displayName}
            <svg className={`w-3 h-3 transition-transform ${selectOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {selectOpen && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-[#1a1b26] border border-[#2a2d3e] rounded-md shadow-lg z-50">
              {/* 搜索输入 */}
              <div className="p-2 border-b border-[#2a2d3e]">
                <div className="flex gap-1">
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKey}
                    placeholder="输入代码，如 600519"
                    className="flex-1 bg-[#24283b] text-[#c0caf5] text-[12px] px-2 py-1.5 rounded border border-[#363b54] outline-none placeholder:text-[#565f89] focus:border-[#7aa2f7]"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-2 py-1.5 bg-[#7aa2f7] text-[#1a1b26] rounded text-[11px] font-medium hover:bg-[#89b4fa]"
                  >
                    跳转
                  </button>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto">
                {/* 预设指数 */}
                {PRESET_SYMBOLS.map((s) => (
                  <button
                    key={s.code}
                    onClick={() => handleSelect(s.code)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] transition-colors hover:bg-[#24283b] ${
                      s.code === symbol ? 'text-[#7aa2f7] bg-[#24283b]' : 'text-[#c0caf5]'
                    }`}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-[#9aa4ce] text-[11px] shrink-0 ml-2">{formatSymbol(s.code)}</span>
                  </button>
                ))}

                {/* 分割线 + 历史记录 */}
                {histItems.length > 0 && (
                  <>
                    <div className="h-px bg-[#2a2d3e] mx-2 my-1" />
                    {histItems.map((h) => (
                      <button
                        key={h.code}
                        onClick={() => handleSelect(h.code)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] transition-colors hover:bg-[#24283b] ${
                          h.code === symbol ? 'text-[#7aa2f7] bg-[#24283b]' : 'text-[#c0caf5]'
                        }`}
                      >
                        <span className="font-medium truncate">{h.name}</span>
                        <span className="text-[#9aa4ce] text-[11px] shrink-0 ml-2">{formatSymbol(h.code)}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

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