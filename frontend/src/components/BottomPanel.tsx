import { useStore } from '../store';
import type { ActiveTab } from '../types';

export function BottomPanel() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const result = useStore((s) => s.result);

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'overview', label: '收益概览' },
    { key: 'curve', label: '收益曲线' },
    { key: 'trades', label: '交易明细' },
    { key: 'logs', label: '运行日志' },
  ];

  return (
    <div className="h-48 bg-gradient-to-b from-[#1a1b26] to-[#1f2335] rounded-lg border border-[#2a2d3e] flex flex-col">
      <div className="flex items-center border-b border-[#2a2d3e] px-3">
        {tabs.map((tab) => (
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
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: '总收益', value: result ? `${result.totalReturn.toFixed(2)}%` : '--' },
              { label: '年化收益', value: result ? `${result.annualReturn.toFixed(2)}%` : '--' },
              { label: '最大回撤', value: result ? `${result.maxDrawdown.toFixed(2)}%` : '--' },
              { label: '胜率', value: result ? `${result.winRate.toFixed(2)}%` : '--' },
              { label: '盈亏比', value: result ? result.profitFactor.toFixed(2) : '--' },
              { label: '交易次数', value: result ? result.tradeCount.toString() : '--' },
            ].map((item) => (
              <div key={item.label} className="bg-[#0d0e15] rounded-md p-2.5 border border-[#2a2d3e]">
                <div className="text-[10px] text-[#545c7e] mb-1">{item.label}</div>
                <div className="text-sm text-[#c0caf5] font-semibold">{item.value}</div>
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
          <div className="text-[#545c7e] text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#2a2d3e]">
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">时间</th>
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">方向</th>
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">价格</th>
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">数量</th>
                  <th className="pb-2 text-[10px] text-[#9aa4ce] font-normal">盈亏</th>
                </tr>
              </thead>
              <tbody>
                {result?.trades.map((trade, i) => (
                  <tr key={i} className="border-b border-[#1a1b26]">
                    <td className="py-1.5 text-[10px]">{new Date(trade.time).toLocaleDateString()}</td>
                    <td className={`py-1.5 text-[10px] ${trade.type === 'BUY' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {trade.type}
                    </td>
                    <td className="py-1.5 text-[10px]">{trade.price.toFixed(2)}</td>
                    <td className="py-1.5 text-[10px]">{trade.amount}</td>
                    <td className={`py-1.5 text-[10px] ${trade.pnl && trade.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {trade.pnl ? `${trade.pnl.toFixed(2)}` : '--'}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={5} className="py-4 text-center">暂无交易记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-[#0d0e15] rounded-md p-2.5 h-full overflow-y-auto font-mono text-[10px] text-[#9aa4ce]">
            <div className="text-[#545c7e]">// 运行日志将在此显示</div>
          </div>
        )}
      </div>
    </div>
  );
}
