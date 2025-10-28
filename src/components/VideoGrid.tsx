import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, ExternalLink, Edit } from "lucide-react";
import EditVideoModal from "./EditVideoModal";

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

export default function VideoGrid() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching videos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
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
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="min-w-[280px] overflow-hidden">
            <div className="aspect-video bg-muted animate-pulse" />
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No videos saved yet. Start by adding your first video!</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative group/container">
        {videos.length > 3 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg opacity-0 group-hover/container:opacity-100 transition-opacity"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg opacity-0 group-hover/container:opacity-100 transition-opacity"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
        
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth px-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {videos.map((video) => (
            <Card
              key={video.id}
              className="min-w-[240px] max-w-[240px] overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer flex-shrink-0 snap-start hover:-translate-y-1"
              onClick={() => handleVideoClick(video.url)}
            >
              <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                {video.thumbnail_path ? (
                  <img src={video.thumbnail_path} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="text-muted-foreground">No thumbnail</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={(e) => handleEditClick(e, video)}
                    className="h-8 w-8"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <ExternalLink className="h-2 w-2" />
                    Open
                  </Badge>
                </div>
              </div>
              <CardContent className="p-3">
                <h3 className="font-semibold text-sm truncate mb-2 group-hover:text-primary transition-colors">{video.title}</h3>
                <div className="flex items-center gap-1.5 mb-2">
                  <Badge variant="secondary" className="text-xs py-0">
                    {video.platform}
                  </Badge>
                  {video.mood && (
                    <Badge variant="outline" className="text-xs py-0">
                      {video.mood}
                    </Badge>
                  )}
                </div>
                {video.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {video.tags.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="text-xs text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <EditVideoModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        video={editingVideo}
        onSuccess={fetchVideos}
      />
    </>
  );
}
