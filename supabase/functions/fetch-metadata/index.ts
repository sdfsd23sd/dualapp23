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
    console.log('Fetching metadata for URL:', url);

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

    // For YouTube, use oEmbed API (works for regular videos and Shorts)
    if (platform === 'youtube') {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        console.log('Fetching YouTube oEmbed:', oembedUrl);
        
        const oembedResponse = await fetch(oembedUrl);
        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json();
          console.log('YouTube oEmbed data:', oembedData);
          
          // Extract hashtags from title
          const title = oembedData.title || 'Untitled';
          const hashtagRegex = /#[\w]+/g;
          const hashtags = title.match(hashtagRegex) || [];
          const tags = hashtags.map((tag: string) => tag.substring(1)); // Remove # symbol
          
          return new Response(
            JSON.stringify({
              success: true,
              metadata: {
                title,
                platform,
                thumbnail_url: oembedData.thumbnail_url || null,
                uploader: oembedData.author_name || '',
                description: '',
                tags,
                raw: { url, oembed: oembedData },
              },
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        console.log('oEmbed failed, falling back to HTML parsing');
      } catch (oembedError) {
        console.error('oEmbed error:', oembedError);
      }
    }

    // Fallback: Fetch basic metadata via HTML parsing
    console.log('Fetching HTML for metadata extraction');
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

    console.log('Extracted metadata:', { title, platform, thumbnail_url });

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
