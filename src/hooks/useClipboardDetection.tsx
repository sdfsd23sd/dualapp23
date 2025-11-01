import { useEffect, useState } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import { App } from '@capacitor/app';

const SUPPORTED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'instagram.com/reel',
  'instagram.com/p',
  'facebook.com',
  'fb.watch'
];

export function useClipboardDetection(enabled: boolean = true) {
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  useEffect(() => {
    if (!enabled) return;

    let intervalId: NodeJS.Timeout;
    let lastCheckTime = 0;
    const COOLDOWN = 3000; // 3 seconds cooldown

    const checkClipboard = async () => {
      const now = Date.now();
      if (now - lastCheckTime < COOLDOWN) return;

      try {
        const { value } = await Clipboard.read();
        
        if (value && value !== lastChecked) {
          // Check if URL matches supported domains
          const isSupported = SUPPORTED_DOMAINS.some(domain => 
            value.includes(domain)
          );

          if (isSupported && (value.startsWith('http://') || value.startsWith('https://'))) {
            setDetectedUrl(value);
            setLastChecked(value);
            lastCheckTime = now;
          }
        }
      } catch (error) {
        console.error('Clipboard check error:', error);
      }
    };

    // Check immediately when enabled
    checkClipboard();
    
    // Check clipboard every 1 second for faster detection
    intervalId = setInterval(checkClipboard, 1000);

    // Listen for app state changes (when app comes to foreground)
    const stateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // Check clipboard immediately when app becomes active
        checkClipboard();
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      stateListener.then(listener => listener.remove());
    };
  }, [enabled, lastChecked]);

  const dismissUrl = () => {
    setDetectedUrl(null);
  };

  return { detectedUrl, dismissUrl };
}
