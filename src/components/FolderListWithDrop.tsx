import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Folder, FolderOpen, FolderInput } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ShareFolderDialog from "./ShareFolderDialog";

interface Folder {
  id: string;
  name: string;
  is_public: boolean;
  created_at: string;
}

interface Video {
  id: string;
  title: string;
  folder_id: string | null;
}

interface FolderListWithDropProps {
  draggedVideo: Video | null;
  onDrop?: () => void;
  refreshTrigger?: number;
}

export default function FolderListWithDrop({ draggedVideo, onDrop, refreshTrigger }: FolderListWithDropProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchFolders();
  }, [refreshTrigger]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFolders(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching folders",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (folderId: string) => {
    if (!draggedVideo) return;

    try {
      const { error } = await supabase
        .from("videos")
        .update({ folder_id: folderId })
        .eq("id", draggedVideo.id);

      if (error) throw error;

      toast({
        title: "Video moved! ✅",
        description: "Video successfully moved to folder",
      });
      
      if (onDrop) onDrop();
    } catch (error: any) {
      toast({
        title: "Error moving video",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setDropTarget(null);
  };

  const handleTouchEnd = (folderId: string) => {
    if (draggedVideo) {
      handleDrop(folderId);
    }
  };

  const handleMouseUp = (folderId: string) => {
    if (draggedVideo) {
      handleDrop(folderId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No folders yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {folders.map((folder) => (
        <div 
          key={folder.id} 
          className="flex items-center gap-1"
          onTouchEnd={() => handleTouchEnd(folder.id)}
          onMouseUp={() => handleMouseUp(folder.id)}
          onMouseEnter={() => draggedVideo && setDropTarget(folder.id)}
          onMouseLeave={() => setDropTarget(null)}
        >
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-start gap-2 transition-all",
              selectedFolder === folder.id && "bg-accent",
              dropTarget === folder.id && draggedVideo && "bg-primary/20 scale-105 ring-2 ring-primary",
              draggedVideo && "hover:bg-primary/10"
            )}
            onClick={() => {
              if (!draggedVideo) {
                navigate(`/folder/${folder.id}`);
              }
            }}
          >
            {dropTarget === folder.id && draggedVideo ? (
              <FolderInput className="h-4 w-4 text-primary animate-pulse" />
            ) : selectedFolder === folder.id ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
            <span className="truncate">{folder.name}</span>
            {dropTarget === folder.id && draggedVideo && (
              <span className="text-xs text-primary ml-auto">Drop here</span>
            )}
          </Button>
          <ShareFolderDialog
            folderId={folder.id}
            isPublic={folder.is_public}
            onTogglePublic={fetchFolders}
          />
        </div>
      ))}
    </div>
  );
}
