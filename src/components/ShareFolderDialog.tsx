import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ShareFolderDialogProps = {
  folderId: string;
  isPublic: boolean;
  onTogglePublic: () => void;
};

export default function ShareFolderDialog({ folderId, isPublic, onTogglePublic }: ShareFolderDialogProps) {
  const [copied, setCopied] = useState(false);
  const [userAlias, setUserAlias] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUserAlias = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('alias')
      .eq('id', user.id)
      .single();

    setUserAlias(profile?.alias || null);
  };

  const handleTogglePublic = async () => {
    const { error } = await supabase
      .from('folders')
      .update({ is_public: !isPublic })
      .eq('id', folderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update folder visibility",
        variant: "destructive",
      });
      return;
    }

    onTogglePublic();
    toast({
      title: isPublic ? "Folder is now private" : "Folder is now public",
      description: isPublic ? "Only you can see this folder" : "Anyone with the link can view this folder",
    });
  };

  const copyShareLink = () => {
    if (!userAlias) {
      toast({
        title: "Set an alias first",
        description: "Go to Settings to set your public alias",
        variant: "destructive",
      });
      return;
    }

    const shareLink = `${window.location.origin}/${userAlias}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied!",
      description: "Share this link to let others view your public folders",
    });
  };

  return (
    <Dialog onOpenChange={(open) => open && fetchUserAlias()}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Folder</DialogTitle>
          <DialogDescription>
            Make this folder public and share your collection with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Public Access</p>
              <p className="text-sm text-muted-foreground">
                {isPublic ? "Anyone with your alias can view" : "Only you can view"}
              </p>
            </div>
            <Button
              variant={isPublic ? "default" : "outline"}
              onClick={handleTogglePublic}
            >
              {isPublic ? "Public" : "Private"}
            </Button>
          </div>

          {isPublic && userAlias && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Share Link</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/${userAlias}`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyShareLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {isPublic && !userAlias && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Set your public alias in Settings to generate a shareable link
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
