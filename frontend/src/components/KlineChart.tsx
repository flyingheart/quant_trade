import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useStore } from '../store';
import type { KlineBar, MaLine } from '../types';

export function KlineChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const maSeriesRefs = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const initRef = useRef(false);
  const [chartReady, setChartReady] = useState(false);

  const klines = useStore((s) => s.klines);
  const maLines = useStore((s) => s.maLines);

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

      const observer = new ResizeObserver(() => {
        chart.resize(container.clientWidth, container.clientHeight);
      });
      observer.observe(container);

      setTimeout(() => {
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
        candlestickSeriesRef.current = candlestickSeries;
        setChartReady(true);
      }, 100);
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!chartReady) return;
    if (!candlestickSeriesRef.current) return;
    if (klines.length === 0) return;

    const candleData = klines.map((k: KlineBar) => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

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
    <div
      ref={chartContainerRef}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }}
    />
  );
}