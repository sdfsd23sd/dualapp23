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

    // Fetch HTML for metadata extraction with enhanced headers
    console.log('Fetching HTML for metadata extraction');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      console.log(`Initial fetch failed with status ${response.status}, attempting fallback`);
      
      // For Facebook URLs, return a graceful fallback since they actively block scraping
      if (platform === 'facebook') {
        console.log('Facebook URL detected, returning fallback metadata');
        return new Response(
          JSON.stringify({
            success: true,
            metadata: {
              title: 'Facebook Video',
              platform: 'facebook',
              thumbnail_url: null,
              uploader: 'Facebook',
              description: 'Facebook video (metadata extraction blocked by Facebook)',
              tags: [],
              raw: { url },
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`Failed to fetch URL: ${response.status} - The website may be blocking automated requests`);
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
      
      // Try to extract from shared data
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});<\/script>/);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
          if (media) {
            if (media.edge_media_to_caption?.edges?.[0]?.node?.text) {
              description = media.edge_media_to_caption.edges[0].node.text;
            }
            if (media.display_url) thumbnail_url = media.display_url;
            if (media.owner?.username) uploader = media.owner.username;
          }
        } catch (e) {
          console.error('Instagram shared data parsing error:', e);
        }
      }
      
      // Try to extract from JSON-LD script tags
      const scriptMatch = html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s);
      if (scriptMatch) {
        try {
          const jsonData = JSON.parse(scriptMatch[1]);
          if (jsonData.caption) description = jsonData.caption;
          if (jsonData.name) title = jsonData.name;
          if (jsonData.thumbnailUrl) thumbnail_url = jsonData.thumbnailUrl;
        } catch (e) {
          console.error('Instagram JSON-LD parsing error:', e);
        }
      }
      
      // Extract from meta tags more aggressively
      if (!thumbnail_url) {
        const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (imgMatch) thumbnail_url = imgMatch[1];
      }
      
      if (!uploader) {
        uploader = 'Instagram';
      }
    } else if (platform === 'facebook') {
      // Facebook video description
      const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
      if (descMatch && descMatch[1]) {
        description = descMatch[1];
      }
      
      // Try to get title from page
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(' | Facebook', '').trim();
      }
      
      // Extract thumbnail more aggressively
      if (!thumbnail_url) {
        const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (imgMatch) thumbnail_url = imgMatch[1];
      }
      
      if (!uploader) {
        uploader = 'Facebook';
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
