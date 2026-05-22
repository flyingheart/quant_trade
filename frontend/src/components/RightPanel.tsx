import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';

const TABS = [
  { key: 'params', label: '参数配置' },
  { key: 'code', label: '策略代码' },
  { key: 'template', label: '模板库' },
];

// @ts-ignore
const CODE_CONTENT = `// @param ma_fast number=5 快线周期
// @param ma_slow number=20 慢线周期
// @param rsi_period number=14 RSI周期
// @param enable_stop_loss bool=true 启用止损

function run() {
  const maFast = MA(CLOSE, ma_fast);
  const maSlow = MA(CLOSE, ma_slow);
  
  // 金叉买入
  if (CROSS(maFast, maSlow)) {
    return BUY;
  }
  
  // 死叉卖出
  if (CROSS(maSlow, maFast)) {
    return SELL;
  }
  
  return HOLD;
}`;

const TEMPLATE_CONTENT = `📚 策略模板库

1. 均线交叉策略
   - 金叉买入，死叉卖出
   - 参数: 快线周期, 慢线周期

2. RSI 超买超卖
   - RSI < 30 买入, RSI > 70 卖出
   - 参数: RSI周期, 超买线, 超卖线

3. 布林带突破
   - 突破上轨卖出, 突破下轨买入
   - 参数: 周期, 标准差倍数

4. MACD 策略
   - DIF 上穿 DEA 买入
   - 参数: 快线, 慢线, 信号线

点击模板加载到编辑器`;

const INDICATOR_GROUPS = [
  { key: 'trend', title: '📈 趋势追踪型 (6个)',
    items: [
      { type: 'MA', name: 'MA 移动平均线', alias: 'ma' },
      { type: 'MACD', name: 'MACD 指数异同', alias: 'macd' },
      { type: 'EMA', name: 'EMA 指数加权均线', alias: 'ema' },
      { type: 'HMA', name: 'HMA 赫尔光滑均线', alias: 'hma' },
      { type: 'SAR', name: 'SAR 抛物线转向', alias: 'sar' },
      { type: 'DMI', name: 'DMI 趋向指标', alias: 'dmi' },
    ],
  },
  { key: 'momentum', title: '⚡ 动量振荡型 (5个)',
    items: [
      { type: 'RSI', name: 'RSI 相对强弱指标', alias: 'rsi' },
      { type: 'KDJ', name: 'KDJ 随机指标', alias: 'kdj' },
      { type: 'CCI', name: 'CCI 顺势通道指标', alias: 'cci' },
      { type: 'WR', name: 'WR 威廉指标', alias: 'willr' },
      { type: 'BIAS', name: 'BIAS 乖离率因子', alias: 'bias' },
    ],
  },
  { key: 'volatility', title: '📦 波动轨道型 (4个)',
    items: [
      { type: 'BOLL', name: 'BOLL 布林带通道', alias: 'boll' },
      { type: 'ATR', name: 'ATR 真实波幅均值', alias: 'atr' },
      { type: 'KC', name: 'KC 肯特纳压力道', alias: 'kc' },
      { type: 'DC', name: 'DC 唐奇安海龟道', alias: 'dc' },
    ],
  },
  { key: 'volume', title: '📊 成交量资金流 (4个)',
    items: [
      { type: 'OBV', name: 'OBV 能量潮因子', alias: 'obv' },
      { type: 'VWAP', name: 'VWAP 成交量权重线', alias: 'vwap' },
      { type: 'CMF', name: 'CMF 蔡金资金流', alias: 'cmf' },
      { type: 'MFI', name: 'MFI 资金流量指标', alias: 'mfi' },
    ],
  },
  { key: 'advanced', title: '🔮 高阶复合型 (3个)',
    items: [
      { type: 'Pivot', name: 'Pivot Points 枢轴点', alias: 'pivot' },
      { type: 'BBI', name: 'BBI 多空综合指数', alias: 'bbi' },
      { type: 'TRIX', name: 'TRIX 三重平滑平均', alias: 'trix' },
    ],
  },
];

function ParamsTab() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    trend: true, momentum: false, volatility: false, volume: false, advanced: false,
  });
  const [buyPoolCards, setBuyPoolCards] = useState<{ id: number; type: string }[]>([]);
  const [sellPoolCards, setSellPoolCards] = useState<{ id: number; type: string }[]>([]);
  const [buyDragOver, setBuyDragOver] = useState(false);
  const [sellDragOver, setSellDragOver] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const buyDropRef = useRef<HTMLDivElement>(null);
  const sellDropRef = useRef<HTMLDivElement>(null);
  const dragTypeRef = useRef<string | null>(null);
  const isDragging = useRef(false);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const buyEl = buyDropRef.current;
    const sellEl = sellDropRef.current;
    console.log('[DnD] pointer-based mount', {
      buyEl: !!buyEl,
      sellEl: !!sellEl,
      buyRect: buyEl ? `${buyEl.getBoundingClientRect().width}x${buyEl.getBoundingClientRect().height}` : 'null',
      sellRect: sellEl ? `${sellEl.getBoundingClientRect().width}x${sellEl.getBoundingClientRect().height}` : 'null',
    });
    if (!buyEl || !sellEl) return;

    const onMove = (e: PointerEvent) => {
      if (!dragTypeRef.current) return;
      isDragging.current = true;

      // Move drag ghost to follow cursor
      if (ghostRef.current) {
        ghostRef.current.style.left = (e.clientX + 12) + 'px';
        ghostRef.current.style.top = (e.clientY + 12) + 'px';
      }

      const buyRect = buyEl.getBoundingClientRect();
      const overBuy = e.clientX >= buyRect.left && e.clientX <= buyRect.right &&
        e.clientY >= buyRect.top && e.clientY <= buyRect.bottom;

      const sellRect = sellEl.getBoundingClientRect();
      const overSell = e.clientX >= sellRect.left && e.clientX <= sellRect.right &&
        e.clientY >= sellRect.top && e.clientY <= sellRect.bottom;

      setBuyDragOver(!!overBuy);
      setSellDragOver(!!overSell);
    };

    const onUp = (e: PointerEvent) => {
      // Remove drag ghost
      if (ghostRef.current) {
        ghostRef.current.remove();
        ghostRef.current = null;
      }

      const type = dragTypeRef.current;
      dragTypeRef.current = null;

      if (!isDragging.current) return;
      isDragging.current = false;

      const buyRect = buyEl.getBoundingClientRect();
      const overBuy = e.clientX >= buyRect.left && e.clientX <= buyRect.right &&
        e.clientY >= buyRect.top && e.clientY <= buyRect.bottom;

      const sellRect = sellEl.getBoundingClientRect();
      const overSell = e.clientX >= sellRect.left && e.clientX <= sellRect.right &&
        e.clientY >= sellRect.top && e.clientY <= sellRect.bottom;

      setBuyDragOver(false);
      setSellDragOver(false);

      if (overBuy && type) {
        setBuyPoolCards((prev) => [...prev, { id: Date.now(), type }]);
      } else if (overSell && type) {
        setSellPoolCards((prev) => [...prev, { id: Date.now(), type }]);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, []);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const handlePointerDown = (e: React.PointerEvent, type: string) => {
    dragTypeRef.current = type;
    isDragging.current = false;

    // Create drag ghost — floating card that follows the cursor
    const item = indicatorMap.find((it) => it.type === type);
    const name = item?.name ?? type;
    const ghost = document.createElement('div');
    ghost.textContent = name;
    ghost.style.cssText = `
      position: fixed;
      left: ${e.clientX + 12}px;
      top: ${e.clientY + 12}px;
      background: #252e42;
      border: 1px solid rgba(255,255,255,0.15);
      border-left: 3px solid #ffb020;
      border-radius: 6px;
      padding: 8px 14px;
      color: #e2e8f5;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-weight: 600;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      pointer-events: none;
      z-index: 9999;
      white-space: nowrap;
      transform: rotate(2deg) scale(1.05);
      opacity: 0.92;
      user-select: none;
    `;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  };

  const removeBuyCard = (id: number) =>
    setBuyPoolCards((prev) => prev.filter((c) => c.id !== id));

  const removeSellCard = (id: number) =>
    setSellPoolCards((prev) => prev.filter((c) => c.id !== id));

  const indicatorMap = INDICATOR_GROUPS.flatMap((g) => g.items);

  const renderCardContent = (type: string, defaultSignal: 'buy' | 'sell' = 'buy') => {
    const signalBadge = defaultSignal === 'sell'
      ? <span className="text-[#f23645] text-[10px] font-bold">🔴 卖出信号</span>
      : <span className="text-[#00c076] text-[10px] font-bold">🟢 买入信号</span>;

    const sel = "bg-[#24283b] text-[#c0caf5] border border-[#2a2d3e] rounded px-2 py-1.5 text-[10px] min-h-[26px]";
    const wr = "flex flex-wrap gap-x-4 gap-y-3 items-center text-xs text-[#9aa4ce]";

    const Rng = ({ min, max, def }: { min: number; max: number; def: number }) => (
      <div className="flex items-center gap-1 min-h-[26px]">
        <input type="range" min={min} max={max} defaultValue={def}
          className="w-14 accent-[#7aa2f7] h-1.5"
          onInput={(e) => { const s = e.currentTarget.nextElementSibling; if (s) s.textContent = (e.target as HTMLInputElement).value; }} />
        <span className="text-[#ffb020] font-bold min-w-3 text-xs">{def}</span>
      </div>
    );

    switch (type) {
      /* ——— 趋势追踪 ——— */
      case 'MA':
      case 'EMA':
      case 'HMA': {
        const label = type === 'MA' ? 'MA' : type;
        const maxP = type === 'HMA' ? 120 : type === 'EMA' ? 100 : 250;
        return (
          <div className={wr}>
            <span>{label}周期:</span><Rng min={2} max={maxP} def={20} />
            <span>当 最新价</span>
            <select className={sel}>
              <option value="cross_over">上穿该均线 ↗</option>
              <option value="cross_under">下破该均线 ↘</option>
              <option value="above">大于该均线</option>
              <option value="below">小于该均线</option>
            </select>
            <span>→ 发出</span>{signalBadge}
          </div>
        );
      }

      case 'MACD':
        return (
          <div className={wr}>
            <span>快线:</span><Rng min={2} max={50} def={12} />
            <span>慢线:</span><Rng min={5} max={200} def={26} />
            <span>信号:</span><Rng min={2} max={50} def={9} />
            <span>当</span>
            <select className={sel}>
              <option value="dif_cross_dea_up">DIF上穿DEA ↗</option>
              <option value="dif_cross_dea_down">DIF下破DEA ↘</option>
              <option value="hist_pos">柱状图翻红</option>
              <option value="hist_neg">柱状图翻绿</option>
            </select>
            <span>→ 判定为</span>{signalBadge}
          </div>
        );

      case 'SAR':
        return (
          <div className={wr}>
            <span>加速因子:</span>
            <div className="flex items-center gap-1 min-h-[26px]">
              <input type="range" min={1} max={8} defaultValue={2} step={1}
                className="w-16 accent-[#7aa2f7] h-1.5"
                onInput={(e) => { const v = +(e.target as HTMLInputElement).value; const s = e.currentTarget.nextElementSibling; if (s) s.textContent = (v * 0.01).toFixed(2); }} />
              <span className="text-[#ffb020] font-bold min-w-3 text-[10px]">0.02</span>
            </div>
            <span>最大加速:</span>
            <div className="flex items-center gap-1 min-h-[26px]">
              <input type="range" min={1} max={12} defaultValue={4} step={1}
                className="w-16 accent-[#7aa2f7] h-1.5"
                onInput={(e) => { const v = +(e.target as HTMLInputElement).value; const s = e.currentTarget.nextElementSibling; if (s) s.textContent = (v * 0.05).toFixed(2); }} />
              <span className="text-[#ffb020] font-bold min-w-3 text-[10px]">0.20</span>
            </div>
            <span>当价格</span>
            <select className={sel}>
              <option value="price_above_sar">上穿SAR ↗</option>
              <option value="price_below_sar">下破SAR ↘</option>
            </select>
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      case 'DMI':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={3} max={60} def={14} />
            <span>条件:</span>
            <select className={sel}>
              <option value="pdi_cross_mdi">+DI上穿-DI ↗</option>
              <option value="mdi_cross_pdi">-DI上穿+DI ↘</option>
              <option value="adx_gt_threshold">ADX大于阈值(趋势强)</option>
              <option value="adx_lt_threshold">ADX小于阈值(趋势弱)</option>
            </select>
            <span>ADX阈值:</span><Rng min={10} max={60} def={25} />
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      /* ——— 动量振荡 ——— */
      case 'RSI':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={2} max={50} def={14} />
            <span>RSI值</span>
            <select className={sel}>
              <option value="below">低于超卖线</option>
              <option value="above">高于超买线</option>
              <option value="between">在超买超卖之间</option>
            </select>
            <span>超卖:</span><Rng min={5} max={45} def={30} />
            <span>超买:</span><Rng min={55} max={95} def={70} w="w-10" />
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      case 'KDJ':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={3} max={40} def={9} />
            <span>
              <select className={sel}>
                <option value="k">K值</option>
                <option value="d">D值</option>
                <option value="j">J值</option>
              </select>
            </span>
            <select className={sel}>
              <option value="below">低于</option>
              <option value="above">高于</option>
            </select>
            <span>阈值:</span><Rng min={5} max={95} def={20} w="w-10" />
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" className="accent-[#7aa2f7]" defaultChecked />
              <span className="text-[10px]">J值联动</span>
            </label>
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      case 'CCI':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={3} max={100} def={20} />
            <span>CCI值</span>
            <select className={sel}>
              <option value="below">跌破</option>
              <option value="above">突破</option>
            </select>
            <select className={sel}>
              <option value="-100">-100 (超卖)</option>
              <option value="100">+100 (超买)</option>
              <option value="-200">-200 (极端超卖)</option>
              <option value="200">+200 (极端超买)</option>
            </select>
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      case 'WR':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={3} max={100} def={14} />
            <span>WR值</span>
            <select className={sel}>
              <option value="below">跌破</option>
              <option value="above">突破</option>
            </select>
            <select className={sel}>
              <option value="-80">-80 (超卖)</option>
              <option value="-20">-20 (超买)</option>
            </select>
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      case 'BIAS':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={3} max={120} def={6} />
            <span>偏离方向:</span>
            <select className={sel}>
              <option value="below">乖离率低于阈值(超卖)</option>
              <option value="above">乖离率高于阈值(超买)</option>
              <option value="abs">偏离度绝对值超过n%</option>
            </select>
            <span>阈值:</span><Rng min={1} max={30} def={5} w="w-10" /><span>%</span>
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      /* ——— 波动轨道 ——— */
      case 'BOLL':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={5} max={120} def={20} />
            <span>标准差:</span><Rng min={1} max={4} def={2} w="w-10" />
            <span>当价格</span>
            <select className={sel}>
              <option value="break_upper">向上突破上轨 ↗</option>
              <option value="break_lower">跌破下轨 ↘</option>
              <option value="touch_mid">触碰中轨支撑</option>
              <option value="squeeze">喇叭口收缩(变盘)</option>
            </select>
            <span>→ 判定为</span>{signalBadge}
          </div>
        );

      case 'ATR':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={3} max={100} def={14} />
            <span>乘数:</span><Rng min={1} max={6} def={2} w="w-10" />
            <span>当价格</span>
            <select className={sel}>
              <option value="break_atr_up">向上突破ATR上轨 ↗</option>
              <option value="break_atr_down">向下突破ATR下轨 ↘</option>
            </select>
            <span>→ 判定为</span>{signalBadge}
          </div>
        );

      case 'KC':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={5} max={60} def={20} />
            <span>ATR倍数:</span><Rng min={1} max={4} def={2} w="w-10" />
            <span>当价格</span>
            <select className={sel}>
              <option value="break_upper">突破上轨 ↗</option>
              <option value="break_lower">跌破下轨 ↘</option>
            </select>
            <span>→ 判定为</span>{signalBadge}
          </div>
        );

      case 'DC':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={5} max={100} def={20} />
            <span>当价格</span>
            <select className={sel}>
              <option value="break_upper">突破上轨 ↗</option>
              <option value="break_lower">跌破下轨 ↘</option>
            </select>
            <span>→ 判定为</span>{signalBadge}
          </div>
        );

      /* ——— 成交量资金流 ——— */
      case 'OBV':
        return (
          <div className={wr}>
            <span>MA周期:</span><Rng min={5} max={60} def={20} />
            <span>条件:</span>
            <select className={sel}>
              <option value="obv_rising">OBV上升趋势 ↗</option>
              <option value="obv_falling">OBV下降趋势 ↘</option>
              <option value="obv_cross_ma">OBV上穿均线</option>
            </select>
            <span>→ 判定为</span>{signalBadge}
          </div>
        );

      case 'VWAP':
        return (
          <div className={wr}>
            <span>条件:</span>
            <select className={sel}>
              <option value="above_vwap">价格在VWAP上方</option>
              <option value="below_vwap">价格在VWAP下方</option>
              <option value="cross_vwap_up">价格上穿VWAP ↗</option>
              <option value="cross_vwap_down">价格下破VWAP ↘</option>
            </select>
            <span>→ 判定为</span>{signalBadge}
          </div>
        );

      case 'CMF':
        return (
          <div className={wr}>
            <span>回溯周期:</span><Rng min={5} max={60} def={20} />
            <span>条件:</span>
            <select className={sel}>
              <option value="cmf_above_zero">CMF大于零(资金流入)</option>
              <option value="cmf_below_zero">CMF小于零(资金流出)</option>
            </select>
            <span>→ 判定为</span>{signalBadge}
          </div>
        );

      case 'MFI':
        return (
          <div className={wr}>
            <span>回溯周期:</span><Rng min={5} max={60} def={14} />
            <span>条件:</span>
            <select className={sel}>
              <option value="mfi_oversold">超卖 (&lt;20)</option>
              <option value="mfi_overbought">超买 (&gt;80)</option>
            </select>
            <span>→ 判定为</span>{signalBadge}
          </div>
        );

      /* ——— 高阶复合 ——— */
      case 'Pivot':
        return (
          <div className={wr}>
            <span>类型:</span>
            <select className={sel}>
              <option value="daily">日线枢轴</option>
              <option value="weekly">周线枢轴</option>
              <option value="monthly">月线枢轴</option>
            </select>
            <span>当价格</span>
            <select className={sel}>
              <option value="break_r1">突破R1阻力位</option>
              <option value="break_r2">突破R2阻力位</option>
              <option value="break_r3">突破R3阻力位</option>
              <option value="break_s1">跌破S1支撑位</option>
              <option value="break_s2">跌破S2支撑位</option>
              <option value="break_s3">跌破S3支撑位</option>
            </select>
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      case 'BBI':
        return (
          <div className={wr}>
            <span>多周期:</span>
            <div className="flex items-center gap-1 text-[10px]">
              <Rng min={2} max={10} def={3} />/<Rng min={5} max={20} def={6} />
              /<Rng min={10} max={60} def={12} />/<Rng min={20} max={200} def={24} />
            </div>
            <span>当价格</span>
            <select className={sel}>
              <option value="price_above_bbi">在BBI上方</option>
              <option value="price_below_bbi">在BBI下方</option>
              <option value="bbi_cross_up">上穿BBI ↗</option>
              <option value="bbi_cross_down">下穿BBI ↘</option>
            </select>
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      case 'TRIX':
        return (
          <div className={wr}>
            <span>周期:</span><Rng min={3} max={60} def={12} />
            <span>信号周期:</span><Rng min={3} max={30} def={9} />
            <span>当TRIX</span>
            <select className={sel}>
              <option value="trix_cross_signal">上穿信号线 ↗</option>
              <option value="trix_cross_signal_down">下破信号线 ↘</option>
              <option value="trix_cross_zero">上穿零轴 ↗</option>
            </select>
            <span>→ 发出</span>{signalBadge}
          </div>
        );

      default:
        return (
          <div className={wr}>
            <span>回溯周期:</span><Rng min={3} max={100} def={14} />
            <span>→ 触发</span>{signalBadge}
          </div>
        );
    }
  };

  const readPool = () => {
    if (buyPoolCards.length === 0 && sellPoolCards.length === 0) {
      alert('池内没有检测到活跃指标！请先从左侧拖拽指标注入到池子中。');
      return;
    }
    const lines: string[] = [];
    buyPoolCards.forEach((c, i) => {
      const alias = indicatorMap.find((it) => it.type === c.type)?.alias ?? c.type;
      lines.push(`[买入因子 ${i + 1}] (${alias}) → 拖拽配置完成 ⚡ 触发 → 🟢 买入信号`);
    });
    sellPoolCards.forEach((c, i) => {
      const alias = indicatorMap.find((it) => it.type === c.type)?.alias ?? c.type;
      lines.push(`[卖出因子 ${i + 1}] (${alias}) → 拖拽配置完成 ⚡ 触发 → 🔴 卖出信号`);
    });
    alert(`【低代码画布策略读取成功！】\n\n${lines.join('\n')}\n\n正在序列化多因子交易树...`);
  };

  return (
    <div className="h-full flex flex-col p-3.5 gap-2 overflow-y-auto">
      <div className="flex gap-3 flex-1 min-h-0">
        {/* 左侧：手风琴指标货架 */}
        <div className="w-[260px] flex-shrink-0 bg-[#1a1b26] rounded-lg border border-[#2a2d3e] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#2a2d3e]">
            <h4 className="text-sm font-semibold text-[#c0caf5]">量化因子积木架</h4>
            <p className="text-[10px] text-[#9aa4ce] mt-1">展开分类，拖拽到右侧策略池</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {INDICATOR_GROUPS.map((group) => (
              <div key={group.key} className="border border-[#2a2d3e] rounded-lg overflow-hidden bg-[rgba(255,255,255,0.01)]">
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-[rgba(255,255,255,0.03)]"
                  onClick={() => toggleGroup(group.key)}
                >
                  <span className="text-xs font-semibold text-[#c0caf5]">{group.title}</span>
                  <span className="text-[10px] text-[#7688a6]">{openGroups[group.key] ? '▼' : '▶'}</span>
                </div>
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{ maxHeight: openGroups[group.key] ? '500px' : '0px' }}
                >
                  <div className="px-2 pb-2 space-y-1.5">
                    {group.items.map((item) => (
                      <div
                        key={item.type}
                        onPointerDown={(e) => handlePointerDown(e, item.type)}
                        className="flex items-center justify-between px-3 py-2 rounded bg-[#24283b] border border-[#2a2d3e] touch-none text-xs hover:border-[#ffb020] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                      >
                        <span className="text-[#c0caf5]">{item.name}</span>
                        <span className="text-[10px] font-mono text-[#7688a6]">{item.alias}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：策略逻辑池 — 买入/卖出双池 */}
        <div className="flex-1 flex flex-col min-w-0 border border-[#2a2d3e] rounded-lg overflow-hidden">
          {/* Buy pool */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a2d3e]">
              <span className="text-xs font-semibold text-[#00c076]">🟢 买入规则池</span>
              <span className="text-[10px] text-[#7688a6]">{buyPoolCards.length} 个组件</span>
            </div>
            <div
              ref={buyDropRef}
              className={`flex-1 bg-[#1a1b26] m-2 border-2 border-dashed rounded-xl p-3 overflow-y-auto flex flex-col gap-2 relative transition-colors ${
                buyDragOver ? 'border-[#00c076] bg-[rgba(0,192,118,0.03)]' : 'border-[#2a2d3e]'
              }`}
            >
              {buyPoolCards.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] text-[#7688a6] leading-6 text-center">
                  📥 将指标积木拖拽到此区域<br />自动归入 <span className="text-[#00c076] font-semibold">买入规则</span>
                </div>
              )}
              {buyPoolCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-[#24283b] border border-[#2a2d3e] border-l-4 border-l-[#00c076] rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-[#c0caf5] flex items-center gap-1.5">
                      📦 {card.type} 因子
                      <span className="text-[10px] font-mono text-[#7688a6] bg-[rgba(0,0,0,0.2)] px-1 rounded">
                        {indicatorMap.find((it) => it.type === card.type)?.alias ?? card.type}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#7688a6] cursor-pointer hover:text-[#f23645]" onClick={() => removeBuyCard(card.id)}>✕ 移出池子</span>
                  </div>
                  {renderCardContent(card.type, 'buy')}
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#2a2d3e] mx-3 flex-shrink-0" />

          {/* Sell pool */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a2d3e]">
              <span className="text-xs font-semibold text-[#f23645]">🔴 卖出规则池</span>
              <span className="text-[10px] text-[#7688a6]">{sellPoolCards.length} 个组件</span>
            </div>
            <div
              ref={sellDropRef}
              className={`flex-1 bg-[#1a1b26] m-2 border-2 border-dashed rounded-xl p-3 overflow-y-auto flex flex-col gap-2 relative transition-colors ${
                sellDragOver ? 'border-[#f23645] bg-[rgba(242,54,69,0.03)]' : 'border-[#2a2d3e]'
              }`}
            >
              {sellPoolCards.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] text-[#7688a6] leading-6 text-center">
                  📥 将指标积木拖拽到此区域<br />自动归入 <span className="text-[#f23645] font-semibold">卖出规则</span>
                </div>
              )}
              {sellPoolCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-[#24283b] border border-[#2a2d3e] border-l-4 border-l-[#f23645] rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-[#c0caf5] flex items-center gap-1.5">
                      📦 {card.type} 因子
                      <span className="text-[10px] font-mono text-[#7688a6] bg-[rgba(0,0,0,0.2)] px-1 rounded">
                        {indicatorMap.find((it) => it.type === card.type)?.alias ?? card.type}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#7688a6] cursor-pointer hover:text-[#f23645]" onClick={() => removeSellCard(card.id)}>✕ 移出池子</span>
                  </div>
                  {renderCardContent(card.type, 'sell')}
                </div>
              ))}
            </div>
          </div>

          <div className="px-3 py-2 border-t border-[#2a2d3e] flex items-center justify-between flex-shrink-0 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#9aa4ce] font-medium whitespace-nowrap">回测区间:</span>
              <input type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#24283b] text-[#c0caf5] border border-[#2a2d3e] rounded px-2 py-1.5 text-[11px] outline-none focus:border-[#7aa2f7] w-[120px] min-h-[26px]" />
              <span className="text-[#7688a6] text-[10px] min-h-[26px] leading-[26px]">至</span>
              <input type="date" value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#24283b] text-[#c0caf5] border border-[#2a2d3e] rounded px-2 py-1.5 text-[11px] outline-none focus:border-[#7aa2f7] w-[120px] min-h-[26px]" />
            </div>
            <button
              onClick={readPool}
              className="px-5 py-2 rounded text-xs font-semibold bg-[#00c076] text-white hover:brightness-110 transition-all"
            >
              验证策略
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RightPanel() {
  const [activeTab, setActiveTab] = useState('params');
  const strategyCode = useStore((s) => s.strategyCode);
  const setStrategyCode = useStore((s) => s.setStrategyCode);

  return (
    <div className="bg-gradient-to-b from-[#1a1b26] to-[#1f2335] rounded-lg border border-[#2a2d3e] flex flex-col overflow-hidden h-full">
      <div className="flex items-center border-b border-[#2a2d3e] flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-all ${activeTab === tab.key
                ? 'text-[#7aa2f7] border-b-2 border-[#7aa2f7] bg-[#24283b]'
                : 'text-[#9aa4ce] hover:text-[#c0caf5]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'code' && (
          <textarea
            value={strategyCode}
            onChange={(e) => setStrategyCode(e.target.value)}
            className="w-full h-full p-3 text-xs text-[#c0caf5] font-mono bg-[#0d0e15] overflow-auto whitespace-pre-wrap resize-none outline-none focus:ring-1 focus:ring-[#7aa2f7] border-0"
            spellCheck={false}
          />
        )}
        {activeTab === 'template' && (
          <pre className="w-full h-full p-3 text-xs text-[#c0caf5] font-mono bg-[#0d0e15] overflow-auto whitespace-pre-wrap">
            {TEMPLATE_CONTENT}
          </pre>
        )}
        {activeTab === 'params' && <ParamsTab />}
      </div>
    </div>
  );
}