import { useState } from 'react';

const TABS = [
  { key: 'overview', label: '收益概览' },
  { key: 'curve', label: '收益曲线' },
  { key: 'trades', label: '交易明细' },
  { key: 'logs', label: '运行日志' },
];

const MOCK_TRADES = [
  { time: '2024-03-15', direction: '买入', price: '¥1,680.00', amount: '100', pnl: '-', pnlRate: '-' },
  { time: '2024-04-02', direction: '卖出', price: '¥1,820.00', amount: '100', pnl: '+¥14,000', pnlRate: '+8.33%' },
  { time: '2024-05-10', direction: '买入', price: '¥1,560.00', amount: '120', pnl: '-', pnlRate: '-' },
  { time: '2024-06-18', direction: '卖出', price: '¥1,720.00', amount: '120', pnl: '+¥19,200', pnlRate: '+10.26%' },
  { time: '2024-07-22', direction: '买入', price: '¥1,650.00', amount: '110', pnl: '-', pnlRate: '-' },
  { time: '2024-08-05', direction: '卖出', price: '¥1,580.00', amount: '110', pnl: '-¥7,700', pnlRate: '-4.24%' },
];

const MOCK_LOGS = [
  { time: '10:23:15', level: 'INFO', message: '回测引擎初始化完成' },
  { time: '10:23:15', level: 'INFO', message: '加载 K 线数据: 250 根 (2024-01-01 ~ 2024-12-31)' },
  { time: '10:23:15', level: 'INFO', message: '策略参数: ma_fast=5, ma_slow=20, rsi=14' },
  { time: '10:23:16', level: 'INFO', message: '开始回测...' },
  { time: '10:23:16', level: 'INFO', message: '[2024-03-15] 买入信号触发 @ ¥1,680.00 (MA5 上穿 MA20)' },
  { time: '10:23:16', level: 'INFO', message: '[2024-04-02] 卖出信号触发 @ ¥1,820.00 (MA5 下穿 MA20) | 盈亏: +8.33%' },
  { time: '10:23:16', level: 'WARN', message: '[2024-08-05] 止损触发 @ ¥1,580.00 | 亏损: -4.24%' },
  { time: '10:23:17', level: 'INFO', message: '回测完成 | 总收益: +28.35% | 交易次数: 24 | 胜率: 63.2%' },
];

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="h-48 bg-gradient-to-b from-[#1a1b26] to-[#1f2335] rounded-lg border border-[#2a2d3e] flex flex-col">
      <div className="flex items-center border-b border-[#2a2d3e] px-3 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs transition-all ${
              activeTab === tab.key
                ? 'text-[#c0caf5] border-b-2 border-[#7aa2f7]'
                : 'text-[#545c7e] hover:text-[#9aa4ce]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: '总收益', value: '+28.35%', profit: true },
              { label: '年化收益', value: '+15.62%', profit: true },
              { label: '最大回撤', value: '-4.21%', loss: true },
              { label: '胜率', value: '63.2%' },
              { label: '交易次数', value: '24' },
            ].map((item) => (
              <div key={item.label} className="bg-[#0d0e15] rounded-md p-2.5 border border-[#2a2d3e]">
                <div className="text-[10px] text-[#545c7e] mb-1">{item.label}</div>
                <div className={`text-sm font-semibold ${
                  item.profit ? 'text-[#22c55e]' : item.loss ? 'text-[#ef4444]' : 'text-[#c0caf5]'
                }`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'curve' && (
          <div className="flex items-center justify-center h-full text-[#545c7e] text-xs">
            收益曲线图表（待实现）
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#2a2d3e]">
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">时间</th>
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">方向</th>
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">价格</th>
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">数量</th>
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">盈亏</th>
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">收益率</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TRADES.map((trade, i) => (
                  <tr key={i} className="border-b border-[#1a1b26]">
                    <td className="py-1.5 text-[10px] text-[#9aa4ce]">{trade.time}</td>
                    <td className={`py-1.5 text-[10px] font-medium ${
                      trade.direction === '买入' ? 'text-[#22c55e]' : 'text-[#ef4444]'
                    }`}>
                      {trade.direction}
                    </td>
                    <td className="py-1.5 text-[10px] text-[#c0caf5]">{trade.price}</td>
                    <td className="py-1.5 text-[10px] text-[#9aa4ce]">{trade.amount}</td>
                    <td className={`py-1.5 text-[10px] font-medium ${
                      trade.pnl.startsWith('+') ? 'text-[#22c55e]' : trade.pnl.startsWith('-') ? 'text-[#ef4444]' : 'text-[#545c7e]'
                    }`}>
                      {trade.pnl}
                    </td>
                    <td className={`py-1.5 text-[10px] font-medium ${
                      trade.pnlRate.startsWith('+') ? 'text-[#22c55e]' : trade.pnlRate.startsWith('-') ? 'text-[#ef4444]' : 'text-[#545c7e]'
                    }`}>
                      {trade.pnlRate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-[#0d0e15] rounded-md p-2.5 h-full overflow-y-auto font-mono text-[10px]">
            {MOCK_LOGS.map((log, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5">
                <span className="text-[#545c7e] whitespace-nowrap">{log.time}</span>
                <span className={`px-1 rounded text-[9px] font-medium whitespace-nowrap ${
                  log.level === 'INFO' ? 'bg-[#24283b] text-[#7aa2f7]' : 'bg-[#2a2d3e] text-[#e0af68]'
                }`}>
                  {log.level}
                </span>
                <span className="text-[#9aa4ce]">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
