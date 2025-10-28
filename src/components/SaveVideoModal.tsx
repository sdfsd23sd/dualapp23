import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface SaveVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  onSuccess?: () => void;
}

interface Folder {
  id: string;
  name: string;
}

interface VideoMetadata {
  title: string;
  platform: string;
  thumbnail_url: string | null;
}

export default function SaveVideoModal({ open, onOpenChange, url, onSuccess }: SaveVideoModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFolders();
      fetchMetadata();
    }
  }, [open]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFolders(data || []);
    } catch (error: any) {
      console.error("Error fetching folders:", error);
    }
  };

  const fetchMetadata = async () => {
    setFetchingMetadata(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-metadata", {
        body: { url },
      });

      if (error) throw error;
      setMetadata(data.metadata);
    } catch (error: any) {
      console.error("Error fetching metadata:", error);
      toast({
        title: "Could not fetch video details",
        description: "You can still save it manually",
        variant: "destructive",
      });
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { data, error } = await supabase.functions.invoke("create-folder", {
        body: { name: newFolderName },
      });

      if (error) throw error;
      
      setFolders([...folders, data.folder]);
      setSelectedFolder(data.folder.id);
      setNewFolderName("");
      setShowNewFolder(false);
      
      toast({ title: "Folder created!" });
    } catch (error: any) {
      toast({
        title: "Error creating folder",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!metadata) {
      toast({
        title: "Please wait",
        description: "Still fetching video details...",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const tagsArray = tags.split(",").map(t => t.trim()).filter(t => t);

      const { error } = await supabase.functions.invoke("save-video", {
        body: {
          url,
          title: metadata.title,
          platform: metadata.platform,
          thumbnail_url: metadata.thumbnail_url,
          folder_id: selectedFolder || null,
          tags: tagsArray,
          note: note || null,
        },
      });

      if (error) throw error;

      toast({ title: "Video saved successfully! ✅" });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error saving video",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to Vaultly</DialogTitle>
          <DialogDescription>
            {fetchingMetadata ? "Fetching video details..." : "Organize and save this video"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {metadata?.thumbnail_url && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img 
                src={metadata.thumbnail_url} 
                alt={metadata.title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {metadata && (
            <div>
              <p className="font-medium text-sm">{metadata.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{metadata.platform}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Folder</Label>
            {!showNewFolder ? (
              <div className="flex gap-2">
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setShowNewFolder(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="New folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                  Create
                </Button>
                <Button variant="ghost" onClick={() => setShowNewFolder(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="recipe, cooking, dinner"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a note about this video..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSave} 
            disabled={loading || fetchingMetadata || !metadata}
            className="w-full"
          >
            {loading ? "Saving..." : "Save Video"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
