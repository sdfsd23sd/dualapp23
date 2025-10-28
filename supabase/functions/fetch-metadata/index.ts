import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      throw new Error('URL is required');
    }

    // Detect platform from URL
    let platform = 'unknown';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      platform = 'youtube';
    } else if (url.includes('tiktok.com')) {
      platform = 'tiktok';
    } else if (url.includes('instagram.com')) {
      platform = 'instagram';
    } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
      platform = 'facebook';
    }

    // Fetch basic metadata (simplified for now)
    // In production, you'd use platform-specific APIs or a metadata extraction service
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VaultlyBot/1.0)',
      },
    });

    const html = await response.text();
    
    // Extract basic Open Graph metadata
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const descriptionMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    const title = titleMatch ? titleMatch[1] : 'Untitled';
    const description = descriptionMatch ? descriptionMatch[1] : '';
    const thumbnail_url = imageMatch ? imageMatch[1] : null;

    return new Response(
      JSON.stringify({
        success: true,
        metadata: {
          title,
          platform,
          thumbnail_url,
          uploader: '',
          description,
          raw: { url },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in fetch-metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
