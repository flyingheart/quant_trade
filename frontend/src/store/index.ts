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
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  loadDefaultData: () => Promise<void>;
}

export const useStore = create<Store>((set) => ({
  klines: [],
  maLines: [],
  symbol: 'sh000001',
  interval: 'day',
  strategyCode: '// 编写你的策略\nfunction run() {\n  return HOLD;\n}',
  strategyParams: { maFast: 5, maSlow: 10, rsi: 14 },
  isRunning: false,
  progress: 0,
  result: null,
  error: null,
  activeTab: 'overview',
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,

  setKlines: (klines) => set({ klines }),
  setMaLines: (maLines) => set({ maLines }),
  setStrategyCode: (code) => set({ strategyCode: code }),
  updateParam: (key, value) => set((state) => ({
    strategyParams: { ...state.strategyParams, [key]: value },
  })),

  loadDefaultData: async () => {
    try {
      const klines = await loadApiData({
        symbol: 'sh000001',
        interval: 'Day1',
        source: {
          RestApi: {
            url: 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get',
            api_key: null,
          },
        },
      });
      const maLines = generateMaLines(klines);
      set({ klines, maLines, symbol: 'sh000001', interval: 'day' });
      
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
  toggleLeftPanel: () => set((s) => ({ leftPanelCollapsed: !s.leftPanelCollapsed })),
  toggleRightPanel: () => set((s) => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),
}));
