import type { KlineBar, MaLine } from '../types';

/**
 * 生成模拟K线数据（随机游走算法）
 */
export function generateMockKlines(count = 1000): KlineBar[] {
  const klines: KlineBar[] = [];
  let price = 100;
  const startDate = new Date('2023-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const volatility = 0.02;
    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = price;
    const close = price * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    klines.push({
      time: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return klines;
}

/**
 * 计算移动平均线 (滑动窗口优化，O(n)复杂度)
 */
export function calculateMA(klines: KlineBar[], period: number): MaLine['data'] {
  const result: MaLine['data'] = [];
  if (klines.length < period) return result;
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += klines[i].close;
  }
  
  result.push({
    time: klines[period - 1].time,
    value: parseFloat((sum / period).toFixed(2)),
  });
  
  for (let i = period; i < klines.length; i++) {
    sum = sum - klines[i - period].close + klines[i].close;
    result.push({
      time: klines[i].time,
      value: parseFloat((sum / period).toFixed(2)),
    });
  }
  
  return result;
}

/**
 * 生成多条MA线数据
 */
export function generateMaLines(klines: KlineBar[]): MaLine[] {
  const periods = [
    { period: 5, color: '#f59e0b' },
    { period: 10, color: '#3b82f6' },
    { period: 20, color: '#8b5cf6' },
  ];

  return periods.map(({ period, color }) => ({
    period,
    color,
    data: calculateMA(klines, period),
  }));
}
