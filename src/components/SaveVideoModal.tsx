import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SaveVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  onSuccess?: () => void;
}

interface VideoMetadata {
  title: string;
  platform: string;
  thumbnail_url: string | null;
  tags?: string[];
}

export default function SaveVideoModal({ open, onOpenChange, url: initialUrl, onSuccess }: SaveVideoModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'url' | 'details'>(initialUrl ? 'details' : 'url');
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [customFolderName, setCustomFolderName] = useState("");
  const [suggestedFolders, setSuggestedFolders] = useState<string[]>([]);
  const [existingFolders, setExistingFolders] = useState<Array<{id: string, name: string}>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      if (initialUrl && initialUrl.trim()) {
        setStep('details');
        fetchMetadata(initialUrl);
      } else {
        setStep('url');
      }
    } else {
      // Reset
      setStep('url');
      setUrl("");
      setMetadata(null);
      setTags("");
      setNote("");
      setSelectedFolder("");
      setCustomFolderName("");
      setSuggestedFolders([]);
    }
  }, [open, initialUrl]);

  const fetchMetadata = async (videoUrl: string) => {
    setFetchingMetadata(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-metadata", {
        body: { url: videoUrl },
      });

      if (error) throw error;
      setMetadata(data.metadata);
      
      if (data.metadata.tags && data.metadata.tags.length > 0) {
        setTags(data.metadata.tags.join(", "));
      }
      
      // Get AI folder suggestions
      getSuggestedFolders(data.metadata.title, data.metadata.tags || []);
    } catch (error: any) {
      console.error("Error fetching metadata:", error);
      toast({
        title: "Could not fetch video details",
        description: "You can still enter them manually",
        variant: "destructive",
      });
    } finally {
      setFetchingMetadata(false);
    }
  };

  const getSuggestedFolders = async (title: string, videoTags: string[]) => {
    setLoadingSuggestions(true);
    try {
      // Fetch existing folders
      const { data: foldersData, error: foldersError } = await supabase
        .from("folders")
        .select("id, name")
        .order("created_at", { ascending: false });
      
      if (!foldersError && foldersData) {
        setExistingFolders(foldersData);
      }

      // Get AI suggestions
      const { data, error } = await supabase.functions.invoke("suggest-folders", {
        body: { title, tags: videoTags },
      });

      if (error) throw error;
      setSuggestedFolders(data.suggestions || []);
    } catch (error: any) {
      console.error("Error getting folder suggestions:", error);
      setSuggestedFolders(['General', 'Entertainment', 'Educational', 'Music', 'Other']);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleContinueFromUrl = () => {
    if (!url.trim()) {
      toast({ title: "Please enter a video URL", variant: "destructive" });
      return;
    }
    setStep('details');
    fetchMetadata(url);
  };

  const handleSave = async () => {
    if (!metadata?.title) {
      toast({ title: "Video title is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const tagsArray = tags.split(",").map(t => t.trim()).filter(t => t);
      
      let folderId = null;
      
      // Create folder if custom name is provided
      if (customFolderName.trim()) {
        const { data: folderData, error: folderError } = await supabase.functions.invoke("create-folder", {
          body: { name: customFolderName.trim() },
        });
        if (folderError) throw folderError;
        folderId = folderData.folder.id;
      } else if (selectedFolder) {
        // Check if selected folder exists, if not create it
        const { data: existingFolders } = await supabase
          .from("folders")
          .select("id, name")
          .eq("name", selectedFolder)
          .maybeSingle();
        
        if (existingFolders) {
          folderId = existingFolders.id;
        } else {
          // Create the suggested folder
          const { data: folderData, error: folderError } = await supabase.functions.invoke("create-folder", {
            body: { name: selectedFolder },
          });
          if (folderError) throw folderError;
          folderId = folderData.folder.id;
        }
      }

      const { error } = await supabase.functions.invoke("save-video", {
        body: {
          url: url.trim(),
          title: metadata.title.trim(),
          platform: metadata.platform || "unknown",
          thumbnail_url: metadata.thumbnail_url || null,
          folder_id: folderId,
          tags: tagsArray,
          note: note || null,
        },
      });

      if (error) throw error;

      toast({ title: "Video saved! ✨" });
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 'url' ? 'Add Video URL' : 'Organize Your Video'}
          </DialogTitle>
        </DialogHeader>

        {step === 'url' ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="video-url" className="text-base">Paste your video link</Label>
              <Input
                id="video-url"
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-12 text-base"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleContinueFromUrl()}
              />
            </div>
            <Button 
              onClick={handleContinueFromUrl} 
              className="w-full h-12"
              size="lg"
            >
              Continue
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {fetchingMetadata ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Fetching video details...</p>
              </div>
            ) : (
              <>
                {metadata?.thumbnail_url && (
                  <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
                    <img 
                      src={metadata.thumbnail_url} 
                      alt={metadata.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {metadata && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{metadata.title}</h3>
                    <Badge variant="secondary" className="capitalize">
                      {metadata.platform}
                    </Badge>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Choose or Create Folder</Label>
                    {loadingSuggestions && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                  
                  {existingFolders.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">Your folders:</p>
                      <div className="flex flex-wrap gap-2">
                        {existingFolders.map((folder) => (
                          <Badge
                            key={folder.id}
                            variant={selectedFolder === folder.name ? "default" : "outline"}
                            className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                            onClick={() => {
                              setSelectedFolder(selectedFolder === folder.name ? "" : folder.name);
                              setCustomFolderName("");
                            }}
                          >
                            {selectedFolder === folder.name && <Check className="h-3 w-3 mr-1" />}
                            {folder.name}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {suggestedFolders.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">AI suggestions:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedFolders.map((folder) => (
                          <Badge
                            key={folder}
                            variant={selectedFolder === folder ? "default" : "outline"}
                            className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                            onClick={() => {
                              setSelectedFolder(selectedFolder === folder ? "" : folder);
                              setCustomFolderName("");
                            }}
                          >
                            {selectedFolder === folder && <Check className="h-3 w-3 mr-1" />}
                            <Sparkles className="h-3 w-3 mr-1" />
                            {folder}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                  
                  <div className="relative">
                    <Input
                      placeholder="Or type a custom folder name..."
                      value={customFolderName}
                      onChange={(e) => {
                        setCustomFolderName(e.target.value);
                        if (e.target.value) setSelectedFolder("");
                      }}
                      className="pl-10 border-2"
                    />
                    <Sparkles className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="tags" className="text-base">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="recipe, cooking, dinner"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="note" className="text-base">Note (optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="Add any notes about this video..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('url')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={loading || fetchingMetadata}
                    className="flex-1"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Video'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
