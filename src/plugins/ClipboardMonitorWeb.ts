import { WebPlugin } from '@capacitor/core';
import type { ClipboardMonitorPlugin } from './ClipboardMonitor';

export class ClipboardMonitorWeb extends WebPlugin implements ClipboardMonitorPlugin {
  async startMonitoring(): Promise<void> {
    console.log('Clipboard monitoring not supported on web');
  }

  async stopMonitoring(): Promise<void> {
    console.log('Clipboard monitoring not supported on web');
  }

  async checkOverlayPermission(): Promise<{ granted: boolean }> {
    return { granted: false };
  }

  async requestOverlayPermission(): Promise<void> {
    console.log('Overlay permission not supported on web');
  }
}
