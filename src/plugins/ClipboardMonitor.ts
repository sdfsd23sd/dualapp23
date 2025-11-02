import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface ClipboardMonitorPlugin {
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  checkOverlayPermission(): Promise<{ granted: boolean }>;
  requestOverlayPermission(): Promise<void>;
  addListener(
    eventName: 'clipboardDetected',
    listenerFunc: (event: { url: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'saveClicked',
    listenerFunc: (event: { url: string }) => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const ClipboardMonitor = registerPlugin<ClipboardMonitorPlugin>('ClipboardMonitor', {
  web: () => import('./ClipboardMonitorWeb').then(m => new m.ClipboardMonitorWeb()),
});

export default ClipboardMonitor;
