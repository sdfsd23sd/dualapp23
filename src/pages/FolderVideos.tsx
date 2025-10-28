import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, ExternalLink, Edit } from "lucide-react";
import EditVideoModal from "@/components/EditVideoModal";

interface Video {
  id: string;
  title: string;
  url: string;
  platform: string;
  thumbnail_path: string | null;
  tags: string[];
  note: string | null;
  folder_id: string | null;
  mood: string | null;
  created_at: string;
}

interface Folder {
  id: string;
  name: string;
}

export default function FolderVideos() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (folderId) {
      fetchFolderAndVideos();
    }
  }, [folderId]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredVideos(videos);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = videos.filter(
        (video) =>
          video.title.toLowerCase().includes(query) ||
          video.tags.some((tag) => tag.toLowerCase().includes(query))
      );
      setFilteredVideos(filtered);
    }
  }, [searchQuery, videos]);

  const fetchFolderAndVideos = async () => {
    try {
      // Fetch folder info
      const { data: folderData, error: folderError } = await supabase
        .from("folders")
        .select("id, name")
        .eq("id", folderId)
        .single();

      if (folderError) throw folderError;
      setFolder(folderData);

      // Fetch videos in folder
      const { data: videosData, error: videosError } = await supabase
        .from("videos")
        .select("*")
        .eq("folder_id", folderId)
        .order("created_at", { ascending: false });

      if (videosError) throw videosError;
      setVideos(videosData || []);
      setFilteredVideos(videosData || []);
    } catch (error: any) {
      toast({
        title: "Error loading folder",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, video: Video) => {
    e.stopPropagation();
    setEditingVideo(video);
    setEditModalOpen(true);
  };

  const handleVideoClick = (url: string) => {
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">{folder?.name || "Folder"}</h1>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos in this folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? "No videos found matching your search." : "No videos in this folder yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVideos.map((video) => (
              <Card
                key={video.id}
                className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
                onClick={() => handleVideoClick(video.url)}
              >
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {video.thumbnail_path ? (
                    <img src={video.thumbnail_path} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-muted-foreground">No thumbnail</div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={(e) => handleEditClick(e, video)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge variant="secondary" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold truncate mb-2">{video.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {video.platform}
                    </Badge>
                    {video.mood && (
                      <Badge variant="outline" className="text-xs">
                        {video.mood}
                      </Badge>
                    )}
                  </div>
                  {video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {video.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-xs text-muted-foreground">
                          #{tag}
                        </span>
                      ))}
                      {video.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{video.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  {video.note && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{video.note}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <EditVideoModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        video={editingVideo}
        onSuccess={fetchFolderAndVideos}
      />
    </div>
  );
}
