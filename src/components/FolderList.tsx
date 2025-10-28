import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Folder, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ShareFolderDialog from "./ShareFolderDialog";

interface Folder {
  id: string;
  name: string;
  is_public: boolean;
  created_at: string;
}

export default function FolderList() {
  const { toast } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, []);

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
        <div key={folder.id} className="flex items-center gap-1">
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-start gap-2",
              selectedFolder === folder.id && "bg-accent"
            )}
            onClick={() => setSelectedFolder(folder.id === selectedFolder ? null : folder.id)}
          >
            {selectedFolder === folder.id ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
            <span className="truncate">{folder.name}</span>
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
