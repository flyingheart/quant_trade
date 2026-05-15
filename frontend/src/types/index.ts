export interface KlineBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MaLine {
  period: number;
  color: string;
  data: { time: string; value: number }[];
}

export interface TradeRecord {
  time: number;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  pnl?: number;
}

export interface BacktestResult {
  totalReturn: number;
  annualReturn: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  tradeCount: number;
  equityCurve: number[];
  trades: TradeRecord[];
  signals: { index: number; type: 'BUY' | 'SELL' }[];
}

export type ActiveTab = 'overview' | 'curve' | 'trades' | 'logs';

export interface AppState {
  klines: KlineBar[];
  maLines: MaLine[];
  symbol: string;
  interval: string;
  strategyCode: string;
  strategyParams: Record<string, unknown>;
  isRunning: boolean;
  progress: number;
  result: BacktestResult | null;
  error: string | null;
  activeTab: ActiveTab;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
}
