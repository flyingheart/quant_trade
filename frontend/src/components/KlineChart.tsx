import { useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData } from 'lightweight-charts';
import { useStore } from '../store';
import type { KlineBar, MaLine } from '../types';

export function KlineChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maSeriesRefs = useRef<Map<number, ISeriesApi<'Line'> | null>>(new Map());

  const klines = useStore((s) => s.klines);
  const maLines = useStore((s) => s.maLines);

  const initChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d0e15' },
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
        timeVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cleanup = initChart();
    return cleanup;
  }, [initChart]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;

    const candleData: CandlestickData[] = klines.map((k: KlineBar) => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

    const volumeData: HistogramData[] = klines.map((k: KlineBar) => ({
      time: k.time,
      value: k.volume,
      color: k.close >= k.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
    }));

    candlestickSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    if (candleData.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [klines]);

  useEffect(() => {
    if (!chartRef.current) return;

    maSeriesRefs.current.forEach((series) => {
      if (series) chartRef.current!.removeSeries(series);
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

      const lineData: LineData[] = ma.data.map((d) => ({
        time: d.time,
        value: d.value,
      }));

      lineSeries.setData(lineData);
      maSeriesRefs.current.set(ma.period, lineSeries);
    });
  }, [maLines]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}
