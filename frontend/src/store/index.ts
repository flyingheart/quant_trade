import { create } from 'zustand';
import type { AppState, KlineBar, MaLine } from '../types';
import { generateMockKlines, generateMaLines } from '../utils/mockData';

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
}

const mockKlines = generateMockKlines(1000);
const mockMaLines = generateMaLines(mockKlines);

export const useStore = create<Store>((set) => ({
  klines: mockKlines,
  maLines: mockMaLines,
  symbol: 'AAPL',
  interval: '1d',
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

  runBacktest: async () => {
    set({ isRunning: true, progress: 0, error: null });
    try {
      // 模拟回测进度
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
