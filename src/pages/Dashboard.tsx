import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import VideoGridWithDrag from "@/components/VideoGridWithDrag";
import FolderListWithDrop from "@/components/FolderListWithDrop";
import SaveVideoModal from "@/components/SaveVideoModal";
import CreateFolderDialog from "@/components/CreateFolderDialog";
import PermissionSetup from "@/components/PermissionSetup";
import ClipboardMonitor from "@/plugins/ClipboardMonitor";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Plus, LogOut, Settings, Video, ChevronRight } from "lucide-react";

interface DraggedVideo {
  id: string;
  title: string;
  folder_id: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [urlToSave, setUrlToSave] = useState("");
  const [refreshVideos, setRefreshVideos] = useState(0);
  const [refreshFolders, setRefreshFolders] = useState(0);
  const [draggedVideo, setDraggedVideo] = useState<DraggedVideo | null>(null);
  const isAndroid = Capacitor.getPlatform() === 'android';

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

  // Initialize native clipboard monitoring (Android only)
  useEffect(() => {
    if (!isAndroid || !user) return;

    let isSubscribed = true;
    let appStateListener: any = null;
    let permissionCheckInterval: any = null;

    const initClipboardMonitoring = async () => {
      try {
        console.log('🔍 Starting clipboard monitoring initialization');
        
        // Check overlay permission
        const permissionResult = await ClipboardMonitor.checkOverlayPermission();
        console.log('📋 Permission check result:', permissionResult);
        
        if (!permissionResult?.granted) {
          console.log('⏳ Overlay permission not granted, will retry when granted');
          return false;
        }

        console.log('🚀 Starting monitoring service...');
        // Start monitoring
        await ClipboardMonitor.startMonitoring();
        console.log('✅ Clipboard monitoring service started successfully');

        // Listen for save clicks from overlay
        if (isSubscribed) {
          await ClipboardMonitor.addListener('saveClicked', (event) => {
            console.log('💾 Save clicked event received:', event);
            if (event?.url) {
              setUrlToSave(event.url);
              setSaveModalOpen(true);
            }
          });

          toast({
            title: "📱 Clipboard Monitoring Active",
            description: "Copy a video link from any app to save it!",
          });
        }

        return true;

      } catch (error: any) {
        console.error('❌ Clipboard monitoring initialization failed:', error);
        
        // Show error only for actual failures, not permission issues
        if (!error?.message?.includes('permission') && 
            !error?.message?.includes('not granted')) {
          toast({
            title: "Clipboard Monitoring Error",
            description: error.message || "Failed to start monitoring",
            variant: "destructive",
          });
        }
        return false;
      }
    };

    // Listen for app state changes to re-initialize when coming to foreground
    const setupAppListener = async () => {
      try {
        appStateListener = await CapApp.addListener('appStateChange', async ({ isActive }) => {
          if (isActive && isSubscribed) {
            console.log('📱 App became active, re-checking clipboard monitoring...');
            await initClipboardMonitoring();
          }
        });
      } catch (error) {
        console.error('Failed to setup app state listener:', error);
      }
    };

    // Periodically check if permission was granted and start monitoring
    const startPermissionCheck = () => {
      permissionCheckInterval = setInterval(async () => {
        if (isSubscribed) {
          const started = await initClipboardMonitoring();
          if (started) {
            // Stop checking once successfully started
            if (permissionCheckInterval) {
              clearInterval(permissionCheckInterval);
              permissionCheckInterval = null;
            }
          }
        }
      }, 3000); // Check every 3 seconds
    };

    // Initial attempt
    initClipboardMonitoring().then(started => {
      if (!started) {
        // If not started, begin periodic checking
        startPermissionCheck();
      }
    });
    
    setupAppListener();

    return () => {
      isSubscribed = false;
      
      // Clear permission check interval
      if (permissionCheckInterval) {
        clearInterval(permissionCheckInterval);
      }
      
      // Stop monitoring service
      if (isAndroid) {
        ClipboardMonitor.stopMonitoring().catch(console.error);
        ClipboardMonitor.removeAllListeners().catch(console.error);
      }
      
      // Remove app state listener
      if (appStateListener) {
        Promise.resolve(appStateListener).then((listener: any) => {
          if (listener?.remove) {
            listener.remove();
          }
        }).catch(console.error);
      }
    };
  }, [isAndroid, user, toast]);

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
        {/* Permission Setup Banner */}
        <PermissionSetup />

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
