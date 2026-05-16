import type { KlineBar } from '../types';

export interface DataConfig {
  symbol: string;
  interval: 'Min5' | 'Min15' | 'Min30' | 'Day1';
  source: {
    LocalFile?: { path: string };
    RestApi?: { url: string; api_key: string | null };
  };
}

// 安全地获取 invoke 函数
function getInvoke(): ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null {
  if (typeof window !== 'undefined') {
    if (window.__TAURI__?.core?.invoke) {
      return window.__TAURI__.core.invoke.bind(window.__TAURI__.core);
    }
    if (window.__TAURI_INTERNALS__?.invoke) {
      return window.__TAURI_INTERNALS__.invoke.bind(window.__TAURI_INTERNALS__);
    }
  }
  return null;
}

// 浏览器模式下直接调用腾讯 API
async function loadApiDataViaFetch(config: { symbol: string; interval: string }): Promise<import('../types').KlineBar[]> {
  const intervalMap: Record<string, string> = {
    Min5: '5',
    Min15: '15',
    Min30: '30',
    Day1: 'day',
  };
  const interval = intervalMap[config.interval] || 'day';
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${config.symbol},${interval},,,1000,qfq`;
  
  const resp = await fetch(url);
  const json = await resp.json();
  
  const klines: import('../types').KlineBar[] = [];
  // 个股使用 qfqday（前复权），指数使用 day
  const rawData = json?.data?.[config.symbol];
  const dayData = rawData?.qfqday || rawData?.day;
  if (Array.isArray(dayData)) {
    for (const item of dayData) {
      if (Array.isArray(item) && item.length >= 6) {
        klines.push({
          time: item[0],
          open: parseFloat(item[1]),
          close: parseFloat(item[2]),
          high: parseFloat(item[3]),
          low: parseFloat(item[4]),
          volume: parseFloat(item[5]),
        });
      }
    }
  }
  return klines;
}

export async function loadApiData(config: { symbol: string; interval: string; source: { RestApi?: { url: string; api_key: string | null } } }): Promise<import('../types').KlineBar[]> {
  const invoke = getInvoke();
  if (invoke) {
    return invoke('load_api_data', { config }) as Promise<import('../types').KlineBar[]>;
  }
  return loadApiDataViaFetch(config);
}

export async function saveToCache(data: KlineBar[]): Promise<void> {
  const invoke = getInvoke();
  if (!invoke) {
    return;
  }
  return invoke('save_to_cache', { data }) as Promise<void>;
}

export async function queryFromCache(symbol: string, interval: string): Promise<KlineBar[]> {
  const invoke = getInvoke();
  if (!invoke) {
    return [];
  }
  return invoke('query_from_cache', { symbol, interval }) as Promise<KlineBar[]>;
}
