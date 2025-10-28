import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Folder, ArrowLeft } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

type Profile = {
  id: string;
  display_name: string | null;
  alias: string | null;
};

type PublicFolder = {
  id: string;
  name: string;
  created_at: string;
};

type PublicVideo = {
  id: string;
  title: string;
  platform: string;
  thumbnail_path: string | null;
  url: string;
  created_at: string;
};

export default function PublicProfile() {
  const { alias } = useParams<{ alias: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [folders, setFolders] = useState<PublicFolder[]>([]);
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!alias) return;

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('alias', alias)
          .single();

        if (profileError || !profileData) {
          setProfile(null);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch public folders
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (!foldersError && foldersData) {
          setFolders(foldersData);
          if (foldersData.length > 0) {
            setSelectedFolder(foldersData[0].id);
          }
        }

        // Track view
        await supabase.functions.invoke('track-view', {
          body: { profile_id: profileData.id, alias }
        });
      } catch (error) {
        console.error('Error fetching public data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [alias]);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!selectedFolder) return;

      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('folder_id', selectedFolder)
        .order('created_at', { ascending: false });

      if (!videosError && videosData) {
        setVideos(videosData);
      }
    };

    fetchVideos();
  }, [selectedFolder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>The profile "{alias}" does not exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Vaultly</h1>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{profile.display_name || profile.alias}</h2>
          <p className="text-muted-foreground">@{alias}</p>
        </div>

        {folders.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Public Folders</CardTitle>
              <CardDescription>This user hasn't shared any folders yet.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <aside className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4">Public Folders</h3>
              <div className="space-y-2">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedFolder === folder.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <div className="lg:col-span-3">
              <h3 className="text-2xl font-semibold mb-6">
                {folders.find(f => f.id === selectedFolder)?.name || 'Videos'}
              </h3>
              
              {videos.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">No videos in this folder yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <AspectRatio ratio={16 / 9}>
                        {video.thumbnail_path ? (
                          <img
                            src={video.thumbnail_path}
                            alt={video.title}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-muted">
                            <Video className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </AspectRatio>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2 line-clamp-2">{video.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{video.platform}</p>
                        <a href={video.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="w-full">
                            Watch Video
                          </Button>
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
