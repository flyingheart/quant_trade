import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store';
import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

export function TopBar() {
  const rightPanelCollapsed = useStore((s) => s.rightPanelCollapsed);
  const toggleRightPanel = useStore((s) => s.toggleRightPanel);
  const [status] = useState<'ready' | 'running' | 'error'>('ready');
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const handleMinimize = useCallback(() => appWindow.minimize(), []);
  const handleMaximize = useCallback(() => {
    if (maximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  }, [maximized]);
  const handleClose = useCallback(() => appWindow.close(), []);

  return (
    <div
      data-tauri-drag-region
      className="h-11 bg-gradient-to-r from-[#1a1b26] to-[#1f2335] flex items-center px-4 justify-between border-b border-[#2a2d3e] flex-shrink-0"
    >
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="w-6 h-6 bg-gradient-to-br from-[#7aa2f7] to-[#bb9af7] rounded-md flex items-center justify-center text-xs font-bold text-[#1a1b26]">
          Q
        </div>
        <h2 className="text-sm text-[#c0caf5] font-semibold">量化策略回测工具</h2>
        <span className={`w-2 h-2 rounded-full inline-block ${status === 'ready' ? 'bg-[#9ece6a]' : status === 'running' ? 'bg-[#e0af68] animate-pulse' : 'bg-[#f7768e]'
          }`} />
        <span className="text-[11px] text-[#9aa4ce]">
          {status === 'ready' ? '就绪' : status === 'running' ? '运行中' : '错误'}
        </span>
      </div>
      <div className="flex items-center gap-2" data-tauri-no-drag>
        <button className="w-8 h-8 rounded-md flex items-center justify-center bg-[#24283b] text-[#9aa4ce] border border-[#363b54] hover:bg-[#363b54] hover:text-[#c0caf5] transition-all text-sm" title="导入数据">
          📁
        </button>
        <button className="w-8 h-8 rounded-md flex items-center justify-center bg-[#24283b] text-[#9aa4ce] border border-[#363b54] hover:bg-[#363b54] hover:text-[#c0caf5] transition-all text-sm" title="策略库">
          📚
        </button>
        <button className="w-8 h-8 rounded-md flex items-center justify-center bg-[#24283b] text-[#9aa4ce] border border-[#363b54] hover:bg-[#363b54] hover:text-[#c0caf5] transition-all text-sm" title="设置">
          ⚙️
        </button>
        <button
          onClick={toggleRightPanel}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-all text-sm ${!rightPanelCollapsed
            ? 'bg-[#7aa2f7] text-[#1a1b26] border border-[#7aa2f7]'
            : 'bg-[#24283b] text-[#9aa4ce] border border-[#363b54] hover:bg-[#363b54] hover:text-[#c0caf5]'
            }`}
          title="切换编辑器"
        >
          ▣
        </button>

        <div className="w-px h-5 bg-[#363b54] mx-1" />

        <button
          onClick={handleMinimize}
          className="w-8 h-8 rounded-md flex items-center justify-center text-[#9aa4ce] hover:bg-[#363b54] hover:text-[#c0caf5] transition-all"
          title="最小化"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 rounded-md flex items-center justify-center text-[#9aa4ce] hover:bg-[#363b54] hover:text-[#c0caf5] transition-all"
          title={maximized ? '还原' : '最大化'}
        >
          {maximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="3" y="1" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="1" y="3" width="8" height="8" rx="1" fill="#0d0e15" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-md flex items-center justify-center text-[#f7768e] hover:bg-[#f7768e] hover:text-[#1a1b26] transition-all"
          title="关闭"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
