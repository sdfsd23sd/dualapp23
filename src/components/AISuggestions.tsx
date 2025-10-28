import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

export default function AISuggestions() {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string>("");
  const { toast } = useToast();

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-suggestions');
      
      if (error) throw error;
      
      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setSuggestion(data.suggestion);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to generate suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Suggestions
        </CardTitle>
        <CardDescription>
          Get smart recommendations for organizing your videos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={generateSuggestions} 
          disabled={loading}
          className="w-full mb-4"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get Suggestions
            </>
          )}
        </Button>
        
        {suggestion && (
          <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
            {suggestion}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
