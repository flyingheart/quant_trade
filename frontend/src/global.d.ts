interface TauriCore {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
}

interface TauriInternals extends TauriCore {
  transformCallback: (callback: (...args: unknown[]) => void, once?: boolean) => number;
  convertFileSrc: (filePath: string, protocol?: string) => string;
}

declare global {
  interface Window {
    __TAURI__?: {
      core?: TauriCore;
    };
    __TAURI_INTERNALS__?: TauriInternals;
    isTauri?: boolean;
  }
}

export {};
