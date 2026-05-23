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
      className="h-11 bg-gradient-to-r from-surface to-elevated flex items-center px-4 justify-between border-b border-border flex-shrink-0 rounded-xl"
    >
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="w-6 h-6 bg-gradient-to-br from-accent to-accent-hover rounded-md flex items-center justify-center text-deep">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="5" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.5" />
            <rect x="2.5" y="3" width="1" height="12" fill="currentColor" opacity="0.5" />
            <rect x="6.5" y="3" width="3" height="10" rx="0.5" fill="currentColor" />
            <rect x="7.5" y="1" width="1" height="14" fill="currentColor" />
            <rect x="11.5" y="6" width="3" height="7" rx="0.5" fill="currentColor" opacity="0.5" />
            <rect x="12.5" y="4" width="1" height="11" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
        <h2 className="text-sm text-primary font-semibold">量化策略回测工具</h2>
        <span className={`w-2 h-2 rounded-full inline-block ${status === 'ready' ? 'bg-ready' : status === 'running' ? 'bg-running animate-pulse' : 'bg-error'
          }`} />
        <span className="text-[11px] text-secondary">
          {status === 'ready' ? '就绪' : status === 'running' ? '运行中' : '错误'}
        </span>
      </div>
      <div className="flex items-center gap-2" data-tauri-no-drag>
        <button className="w-8 h-8 rounded-xl flex items-center justify-center bg-subtle text-secondary border border-hover hover:bg-hover hover:text-primary transition-all text-sm" title="导入数据">
          📁
        </button>
        <button className="w-8 h-8 rounded-xl flex items-center justify-center bg-subtle text-secondary border border-hover hover:bg-hover hover:text-primary transition-all text-sm" title="策略库">
          📚
        </button>
        <button className="w-8 h-8 rounded-xl flex items-center justify-center bg-subtle text-secondary border border-hover hover:bg-hover hover:text-primary transition-all text-sm" title="设置">
          ⚙️
        </button>
        <button
          onClick={toggleRightPanel}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all text-sm ${!rightPanelCollapsed
            ? 'bg-accent text-deep border border-accent'
            : 'bg-subtle text-secondary border border-hover hover:bg-hover hover:text-primary'
            }`}
          title="切换编辑器"
        >
          ▣
        </button>

        <div className="w-px h-5 bg-hover mx-1" />

        <button
          onClick={handleMinimize}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-subtle text-secondary border border-hover hover:bg-hover hover:text-primary transition-all"
          title="最小化"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-subtle text-secondary border border-hover hover:bg-hover hover:text-primary transition-all"
          title={maximized ? '还原' : '最大化'}
        >
          {maximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="3" y="1" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="1" y="3" width="8" height="8" rx="1" fill="var(--bg-deep)" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-subtle text-secondary border border-hover hover:bg-error hover:text-surface hover:border-error transition-all"
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
