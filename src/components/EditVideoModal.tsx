import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface EditVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    note: string | null;
    folder_id: string | null;
  } | null;
  onSuccess?: () => void;
}

interface Folder {
  id: string;
  name: string;
}

export default function EditVideoModal({ open, onOpenChange, video, onSuccess }: EditVideoModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && video) {
      setNote(video.note || "");
      setSelectedFolder(video.folder_id || "");
      fetchFolders();
    }
  }, [open, video]);

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

  const handleUpdate = async () => {
    if (!video) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("videos")
        .update({
          note: note || null,
          folder_id: selectedFolder || null,
        })
        .eq("id", video.id);

      if (error) throw error;

      toast({ title: "Video updated successfully! ✅" });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error updating video",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!video || !confirm("Are you sure you want to delete this video?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", video.id);

      if (error) throw error;

      toast({ title: "Video deleted successfully! 🗑️" });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Error deleting video",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>
            Update the note or move to a different folder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Folder</label>
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Note</label>
            <Textarea
              placeholder="Add a note about this video..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleUpdate} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Updating..." : "Update Video"}
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={loading}
              variant="destructive"
              size="icon"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
