import { Button } from "@/components/ui/button";
import { X, Save } from "lucide-react";

interface ClipboardBannerProps {
  url: string;
  onSave: () => void;
  onDismiss: () => void;
}

export default function ClipboardBanner({ url, onSave, onDismiss }: ClipboardBannerProps) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-card border shadow-lg rounded-lg p-4 flex items-center gap-4 max-w-md">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1">Link detected</p>
          <p className="text-xs text-muted-foreground truncate">{url}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
