import { create } from 'zustand';
import type { AppState, KlineBar, MaLine } from '../types';
import { generateMaLines } from '../utils/mockData';
import { loadApiData, saveToCache } from '../api/data';
import { generateMockKlines } from '../api/tencent';

interface Store extends AppState {
  setKlines: (klines: KlineBar[]) => void;
  setMaLines: (maLines: MaLine[]) => void;
  setStrategyCode: (code: string) => void;
  updateParam: (key: string, value: unknown) => void;
  runBacktest: () => Promise<void>;
  resetParams: () => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  toggleRightPanel: () => void;
  loadDefaultData: () => Promise<void>;
  loadSymbolData: (symbol: string, interval?: string) => Promise<void>;
  history: { code: string; name: string }[];
  addHistory: (item: { code: string; name: string }) => void;
}

// 从 localStorage 恢复历史记录
const savedHistory = (() => {
  try {
    return JSON.parse(localStorage.getItem('stock_history') || '[]');
  } catch {
    return [];
  }
})();

// 辅助函数：从API加载并处理K线数据
async function fetchAndProcessKlines(symbol: string, interval: string) {
  const klines = await loadApiData({
    symbol,
    interval: interval as 'Min5' | 'Min15' | 'Min30' | 'Day1',
    source: {
      RestApi: {
        url: 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get',
        api_key: null,
      },
    },
  });
  const maLines = generateMaLines(klines);
  return { klines, maLines };
}

export const useStore = create<Store>((set) => ({
  klines: [],
  maLines: [],
  symbol: 'sh000001',
  interval: 'Day1',
  strategyCode: '// 编写你的策略\nfunction run() {\n  return HOLD;\n}',
  strategyParams: { maFast: 5, maSlow: 10, rsi: 14 },
  isRunning: false,
  progress: 0,
  result: null,
  error: null,
  activeTab: 'overview',
  rightPanelCollapsed: false,
  history: savedHistory,

  setKlines: (klines) => set({ klines }),
  setMaLines: (maLines) => set({ maLines }),
  setStrategyCode: (code) => set({ strategyCode: code }),
  updateParam: (key, value) => set((state) => ({
    strategyParams: { ...state.strategyParams, [key]: value },
  })),

  loadDefaultData: async () => {
    try {
      const { klines, maLines } = await fetchAndProcessKlines('sh000001', 'Day1');
      set({ klines, maLines, symbol: 'sh000001', interval: 'Day1' });
      
      try {
        await saveToCache(klines);
      } catch {
        // 缓存失败不影响展示
      }
    } catch {
      const mockKlines = generateMockKlines(1000);
      const mockMaLines = generateMaLines(mockKlines);
      set({ klines: mockKlines, maLines: mockMaLines });
    }
  },

  loadSymbolData: async (symbol: string, interval?: string) => {
    const apiInterval = interval || 'Day1';
    try {
      const { klines, maLines } = await fetchAndProcessKlines(symbol, apiInterval);
      set({ klines, maLines, symbol, interval: apiInterval });
    } catch {
      // 加载失败时不修改数据
    }
  },

  addHistory: (item) => {
    set((state) => {
      const filtered = state.history.filter((h) => h.code !== item.code);
      const next = [item, ...filtered].slice(0, 50);
      try {
        localStorage.setItem('stock_history', JSON.stringify(next));
      } catch { /* ignore */ }
      return { history: next };
    });
  },

  runBacktest: async () => {
    set({ isRunning: true, progress: 0, error: null });
    try {
      await new Promise<void>((resolve) => {
        let current = 0;
        const interval = setInterval(() => {
          current += Math.random() * 15;
          if (current >= 100) {
            current = 100;
            clearInterval(interval);
            set({ progress: 100, isRunning: false });
            resolve();
          } else {
            set({ progress: Math.round(current) });
          }
        }, 200);
      });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : '回测失败', isRunning: false });
    }
  },

  resetParams: () => set({
    strategyParams: { maFast: 5, maSlow: 10, rsi: 14 },
  }),

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleRightPanel: () => set((s) => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),
}));
