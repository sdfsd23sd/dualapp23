import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuthToken } from "@/hooks/useAuthToken";
import { User, Session } from "@supabase/supabase-js";
import VideoGridWithDrag from "@/components/VideoGridWithDrag";
import FolderListWithDrop from "@/components/FolderListWithDrop";
import SaveVideoModal from "@/components/SaveVideoModal";
import CreateFolderDialog from "@/components/CreateFolderDialog";
import { Plus, LogOut, Settings, Video, ChevronRight } from "lucide-react";

interface DraggedVideo {
  id: string;
  title: string;
  folder_id: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  useAuthToken(); // Store auth token for native share target
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [urlToSave, setUrlToSave] = useState("");
  const [refreshVideos, setRefreshVideos] = useState(0);
  const [refreshFolders, setRefreshFolders] = useState(0);
  const [draggedVideo, setDraggedVideo] = useState<DraggedVideo | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/");
  };

  const handleAddVideo = () => {
    setUrlToSave("");
    setSaveModalOpen(true);
  };

  const handleSaveSuccess = () => {
    setRefreshVideos(prev => prev + 1);
  };

  const handleFolderCreated = () => {
    setRefreshFolders(prev => prev + 1);
  };

  const handleDragStart = (video: DraggedVideo) => {
    setDraggedVideo(video);
  };

  const handleDragEnd = () => {
    setDraggedVideo(null);
    setRefreshVideos(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Save Video Modal */}
      <SaveVideoModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        url={urlToSave}
        onSuccess={handleSaveSuccess}
      />

      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
              <Video className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Vaultly
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="rounded-full">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-4xl font-bold">Your Video Vault</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Save, organize, and discover your favorite videos in one beautiful place
          </p>
          <Button onClick={handleAddVideo} size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-all">
            <Plus className="h-5 w-5 mr-2" />
            Add New Video
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Sidebar - Folders */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Folders</h3>
                  <CreateFolderDialog onSuccess={handleFolderCreated} />
                </div>
                <FolderListWithDrop 
                  key={refreshFolders} 
                  draggedVideo={draggedVideo}
                  onDrop={handleDragEnd}
                  refreshTrigger={refreshFolders}
                />
              </Card>
            </div>
          </aside>

          {/* Main - Videos */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">Recent Videos</h3>
                <p className="text-sm text-muted-foreground">Your latest saves</p>
              </div>
              <Button variant="secondary" onClick={() => navigate("/all-videos")} className="gap-2">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <VideoGridWithDrag 
              key={refreshVideos}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              refreshTrigger={refreshVideos}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
