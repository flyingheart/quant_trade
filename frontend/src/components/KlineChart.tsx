import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useStore } from '../store';
import type { KlineBar, MaLine } from '../types';

interface TooltipData {
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  x: number;
  y: number;
}

export function KlineChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const maSeriesRefs = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const klineMapRef = useRef<Map<string, KlineBar>>(new Map());
  const initRef = useRef(false);
  const [chartReady, setChartReady] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const klines = useStore((s) => s.klines);
  const maLines = useStore((s) => s.maLines);

  const handleCrosshairMove = useCallback(
    (param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) => {
      if (!param.time || !param.point) {
        setTooltip(null);
        return;
      }

      let timeKey: string;
      if (typeof param.time === 'string') {
        timeKey = param.time;
      } else if (typeof param.time === 'object' && 'year' in param.time) {
        const t = param.time as { year: number; month: number; day: number };
        timeKey = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
      } else {
        setTooltip(null);
        return;
      }

      const k = klineMapRef.current.get(timeKey);
      if (!k) {
        setTooltip(null);
        return;
      }

      setTooltip({
        time: k.time,
        open: k.open.toFixed(2),
        high: k.high.toFixed(2),
        low: k.low.toFixed(2),
        close: k.close.toFixed(2),
        volume: (k.volume / 10000).toFixed(2),
        x: param.point.x,
        y: param.point.y,
      });
    },
    [],
  );

  useEffect(() => {
    if (initRef.current) return;
    const container = chartContainerRef.current;
    if (!container) return;

    const raf = requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      initRef.current = true;

      const chart = createChart(container, {
        width: rect.width,
        height: rect.height,
        layout: {
          backgroundColor: '#0d0e15',
          textColor: '#a9b1d6',
        },
        grid: {
          vertLines: { color: '#1a1b26' },
          horzLines: { color: '#1a1b26' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: '#2a2d3e',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: '#2a2d3e',
          timeVisible: true,
        },
        handleScroll: true,
        handleScale: true,
      });

      chartRef.current = chart;

      chart.subscribeCrosshairMove(handleCrosshairMove);

      const observer = new ResizeObserver(() => {
        chart.resize(container.clientWidth, container.clientHeight);
      });
      observer.observe(container);

      setTimeout(() => {
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#ef4444',
          downColor: '#22c55e',
          borderUpColor: '#ef4444',
          borderDownColor: '#22c55e',
          wickUpColor: '#ef4444',
          wickDownColor: '#22c55e',
        });
        candlestickSeriesRef.current = candlestickSeries;
        setChartReady(true);
      }, 100);
    });

    return () => cancelAnimationFrame(raf);
  }, [handleCrosshairMove]);

  useEffect(() => {
    if (!chartReady) return;
    if (!candlestickSeriesRef.current) return;
    if (klines.length === 0) return;

    const klineMap = new Map<string, KlineBar>();
    const candleData = klines.map((k: KlineBar) => {
      klineMap.set(k.time, k);
      return {
        time: k.time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      };
    });
    klineMapRef.current = klineMap;

    candlestickSeriesRef.current.setData(candleData);
    chartRef.current?.timeScale().fitContent();
  }, [klines, chartReady]);

  useEffect(() => {
    if (!chartReady || !chartRef.current) return;
    if (maLines.length === 0) return;

    maSeriesRefs.current.forEach((series) => {
      chartRef.current!.removeSeries(series);
    });
    maSeriesRefs.current.clear();

    maLines.forEach((ma: MaLine) => {
      const lineSeries = chartRef.current!.addLineSeries({
        color: ma.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const lineData = ma.data.map((d) => ({
        time: d.time,
        value: d.value,
      }));

      lineSeries.setData(lineData);
      maSeriesRefs.current.set(ma.period, lineSeries);
    });
  }, [maLines, chartReady]);

  return (
    <div ref={chartContainerRef} className="relative w-full h-full">
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 16, (chartContainerRef.current?.clientWidth ?? 999) - 200),
            top: Math.max(tooltip.y - 80, 4),
            zIndex: 100,
            pointerEvents: 'none',
          }}
          className="bg-[#1a1b26] border border-[#2a2d3e] rounded-md px-3 py-2 text-[11px] leading-5 shadow-lg"
        >
          <div className="text-[#a9b1d6] font-medium mb-1">{tooltip.time}</div>
          <div className="grid grid-cols-2 gap-x-4">
            <span className="text-[#9aa4ce]">开: <span className="text-[#c0caf5]">{tooltip.open}</span></span>
            <span className="text-[#9aa4ce]">高: <span className="text-[#c0caf5]">{tooltip.high}</span></span>
            <span className="text-[#9aa4ce]">低: <span className="text-[#c0caf5]">{tooltip.low}</span></span>
            <span className="text-[#9aa4ce]">收: <span className="text-[#c0caf5]">{tooltip.close}</span></span>
            <span className="text-[#9aa4ce] col-span-2">量: <span className="text-[#c0caf5]">{tooltip.volume}万</span></span>
          </div>
        </div>
      )}
    </div>
  );
}