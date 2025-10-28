import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import VideoGrid from "@/components/VideoGrid";
import FolderList from "@/components/FolderList";
import SaveVideoModal from "@/components/SaveVideoModal";
import ClipboardBanner from "@/components/ClipboardBanner";
import AISuggestions from "@/components/AISuggestions";
import { useClipboardDetection } from "@/hooks/useClipboardDetection";
import { Plus, LogOut, Settings, Video } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [urlToSave, setUrlToSave] = useState("");
  const [clipboardEnabled, setClipboardEnabled] = useState(true);
  const { detectedUrl, dismissUrl } = useClipboardDetection(clipboardEnabled);
  const [refreshVideos, setRefreshVideos] = useState(0);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
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

  const handleSaveFromClipboard = () => {
    if (detectedUrl) {
      setUrlToSave(detectedUrl);
      setSaveModalOpen(true);
      dismissUrl();
    }
  };

  const handleAddVideo = () => {
    setUrlToSave("");
    setSaveModalOpen(true);
  };

  const handleSaveSuccess = () => {
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
    <div className="min-h-screen bg-background">
      {/* Clipboard Detection Banner */}
      {detectedUrl && (
        <ClipboardBanner
          url={detectedUrl}
          onSave={handleSaveFromClipboard}
          onDismiss={dismissUrl}
        />
      )}

      {/* Save Video Modal */}
      <SaveVideoModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        url={urlToSave}
        onSuccess={handleSaveSuccess}
      />

      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Vaultly</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Folders & AI */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="sticky top-4 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Folders</h2>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </div>
                <FolderList />
              </div>
              
              <AISuggestions />
            </div>
          </aside>

          {/* Main - Videos */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Your Videos</h2>
              <Button onClick={handleAddVideo}>
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </div>
            <VideoGrid key={refreshVideos} />
          </div>
        </div>
      </main>
    </div>
  );
}
