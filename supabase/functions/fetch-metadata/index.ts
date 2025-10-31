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

    // Fetch HTML for metadata extraction
    console.log('Fetching HTML for metadata extraction');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract Open Graph and Twitter Card metadata
    const extractMeta = (property: string): string => {
      const patterns = [
        new RegExp(`<meta property="${property}" content="([^"]+)"`, 'i'),
        new RegExp(`<meta name="${property}" content="([^"]+)"`, 'i'),
        new RegExp(`<meta property="twitter:${property.replace('og:', '')}" content="([^"]+)"`, 'i'),
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) return match[1];
      }
      return '';
    };

    let title = extractMeta('og:title') || extractMeta('title') || 'Untitled';
    let description = extractMeta('og:description') || extractMeta('description') || '';
    let thumbnail_url = extractMeta('og:image') || extractMeta('image') || null;
    let uploader = extractMeta('og:site_name') || '';

    // Platform-specific extraction
    if (platform === 'youtube') {
      // Try oEmbed for YouTube
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const oembedResponse = await fetch(oembedUrl);
        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json();
          title = oembedData.title || title;
          thumbnail_url = oembedData.thumbnail_url || thumbnail_url;
          uploader = oembedData.author_name || uploader;
        }
      } catch (e) {
        console.error('YouTube oEmbed error:', e);
      }
      
      // Extract description from page script
      const descMatch = html.match(/"description":\s*"([^"]+)"/);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
      }
    } else if (platform === 'tiktok') {
      // TikTok specific extraction
      const scriptMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s);
      if (scriptMatch) {
        try {
          const data = JSON.parse(scriptMatch[1]);
          const videoData = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
          if (videoData) {
            title = videoData.desc || title;
            description = videoData.desc || description;
            thumbnail_url = videoData.video?.cover || thumbnail_url;
            uploader = videoData.author?.nickname || uploader;
          }
        } catch (e) {
          console.error('TikTok parsing error:', e);
        }
      }
    } else if (platform === 'instagram') {
      // Instagram uses og:description which contains caption
      const captionMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      if (captionMatch && captionMatch[1]) {
        description = captionMatch[1];
      }
    } else if (platform === 'facebook') {
      // Facebook video description
      const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
      if (descMatch && descMatch[1]) {
        description = descMatch[1];
      }
    }

    // Extract hashtags from title and description
    const hashtagRegex = /#[\w]+/g;
    const titleTags = (title.match(hashtagRegex) || []).map((tag: string) => tag.substring(1));
    const descTags = (description.match(hashtagRegex) || []).map((tag: string) => tag.substring(1));
    const tags = [...new Set([...titleTags, ...descTags])]; // Remove duplicates

    console.log('Extracted metadata:', { title, platform, thumbnail_url, description: description.substring(0, 100), tags });

    return new Response(
      JSON.stringify({
        success: true,
        metadata: {
          title,
          platform,
          thumbnail_url,
          uploader,
          description,
          tags,
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
