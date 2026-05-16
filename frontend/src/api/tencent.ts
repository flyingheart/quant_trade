import type { KlineBar } from '../types';

/**
 * 生成模拟 K 线数据（开发模式使用）
 */
export function generateMockKlines(count: number): KlineBar[] {
  const klines: KlineBar[] = [];
  let basePrice = 3000;
  const startDate = new Date('2023-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const change = (Math.random() - 0.5) * 50;
    const open = basePrice + change;
    const close = open + (Math.random() - 0.5) * 30;
    const high = Math.max(open, close) + Math.random() * 20;
    const low = Math.min(open, close) - Math.random() * 20;
    const volume = Math.random() * 10000000 + 5000000;

    const timeStr = date.toISOString().split('T')[0];

    klines.push({
      time: timeStr,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2)),
    });

    basePrice = close;
  }

  return klines;
}

/**
 * 直接从腾讯财经 API 获取 K 线数据（开发模式 fallback）
 * 注意：由于 CORS 限制，浏览器环境下可能无法直接调用
 */
export async function fetchKlinesFromTencent(_symbol: string, _interval: string = 'd'): Promise<KlineBar[]> {
  // 在浏览器环境下，由于 CORS 限制，返回空数组
  // 实际数据获取通过 Tauri 后端代理
  console.warn('Tencent API direct call is not available in browser due to CORS');
  return [];
}
