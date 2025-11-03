import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Check } from "lucide-react";
import ClipboardMonitor from "@/plugins/ClipboardMonitor";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export default function PermissionSetup() {
  const { toast } = useToast();
  const [hasPermission, setHasPermission] = useState(false);
  const isAndroid = Capacitor.getPlatform() === 'android';

  useEffect(() => {
    if (!isAndroid) return;
    
    const checkPermission = async () => {
      try {
        const { granted } = await ClipboardMonitor.checkOverlayPermission();
        setHasPermission(granted);
      } catch (error) {
        console.error('Failed to check permission:', error);
      }
    };

    checkPermission();
    
    // Re-check when window regains focus (after user grants permission)
    const handleFocus = () => checkPermission();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAndroid]);

  const requestPermission = async () => {
    try {
      console.log('Requesting overlay permission...');
      
      await ClipboardMonitor.requestOverlayPermission();
      
      console.log('✅ Permission dialog opened successfully');
      toast({
        title: "Grant Permission",
        description: "Please enable 'Display over other apps' and return to Vaultly.",
        duration: 7000,
      });
    } catch (error: any) {
      console.error('❌ Permission request error:', error);
      toast({
        title: "Permission Error",
        description: error?.message || "Unable to open settings. Please go to Settings > Apps > Vaultly > Display over other apps manually.",
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  if (!isAndroid || hasPermission) return null;

  return (
    <Card className="p-6 mb-6 border-primary/50 bg-primary/5">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-lg">Enable Clipboard Detection</h3>
          <p className="text-sm text-muted-foreground">
            Allow Vaultly to display overlays so we can detect when you copy video links from Instagram, TikTok, YouTube, and more!
          </p>
          <Button onClick={requestPermission} className="mt-3">
            <Check className="h-4 w-4 mr-2" />
            Enable Permission
          </Button>
        </div>
      </div>
    </Card>
  );
}
