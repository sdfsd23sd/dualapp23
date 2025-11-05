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
    
    // Use different headers for different platforms
    const headers: Record<string, string> = {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
    
    // Instagram and Facebook work better with bot user agents
    if (platform === 'instagram' || platform === 'facebook') {
      headers['User-Agent'] = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
    } else {
      headers['User-Agent'] = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    }
    
    const response = await fetch(url, { headers });

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
    // Decode HTML entities
    const decodeHtmlEntities = (text: string): string => {
      // Decode numeric HTML entities (&#x1234; and &#1234;)
      text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => 
        String.fromCharCode(parseInt(hex, 16))
      );
      text = text.replace(/&#(\d+);/g, (match, dec) => 
        String.fromCharCode(parseInt(dec, 10))
      );
      
      // Decode named HTML entities
      const entities: Record<string, string> = {
        '&amp;': '&',
        '&quot;': '"',
        '&#x27;': "'",
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>',
        '&nbsp;': ' ',
      };
      
      for (const [entity, char] of Object.entries(entities)) {
        text = text.replace(new RegExp(entity, 'g'), char);
      }
      
      return text;
    };
    
    const extractMeta = (property: string): string => {
      const patterns = [
        new RegExp(`<meta property="${property}" content="([^"]+)"`, 'i'),
        new RegExp(`<meta name="${property}" content="([^"]+)"`, 'i'),
        new RegExp(`<meta property="twitter:${property.replace('og:', '')}" content="([^"]+)"`, 'i'),
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) return decodeHtmlEntities(match[1]);
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
      console.log('Processing Instagram metadata...');
      
      // Instagram og:description contains the caption
      const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
      if (ogDescMatch && ogDescMatch[1]) {
        description = decodeHtmlEntities(ogDescMatch[1]);
        console.log('Found Instagram description:', description.substring(0, 100));
      }
      
      // Try alternate description patterns
      if (!description) {
        const altDescMatch = html.match(/<meta name="description" content="([^"]+)"/i);
        if (altDescMatch && altDescMatch[1]) {
          description = decodeHtmlEntities(altDescMatch[1]);
        }
      }
      
      // Extract thumbnail - Instagram uses og:image
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
      if (ogImageMatch && ogImageMatch[1]) {
        thumbnail_url = decodeHtmlEntities(ogImageMatch[1]);
        console.log('Found Instagram thumbnail');
      }
      
      // Try alternate image patterns
      if (!thumbnail_url) {
        const altImgMatch = html.match(/<meta property="og:image:secure_url" content="([^"]+)"/i);
        if (altImgMatch) thumbnail_url = altImgMatch[1];
      }
      
      // Get title/uploader from og:title
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        const decodedTitle = decodeHtmlEntities(ogTitleMatch[1]);
        const titleParts = decodedTitle.split('on Instagram:');
        if (titleParts.length > 0) {
          uploader = titleParts[0].trim().replace(/"/g, '');
          if (titleParts.length > 1) {
            title = titleParts[1].trim();
          }
        }
      }
      
      if (!uploader) uploader = 'Instagram';
      if (!title || title === 'Instagram') {
        title = description.substring(0, 50) || 'Instagram Video';
      }
      
      console.log('Instagram metadata extracted:', { title: title.substring(0, 50), uploader, hasThumb: !!thumbnail_url, hasDesc: !!description });
      
    } else if (platform === 'facebook') {
      console.log('Processing Facebook metadata...');
      
      // Facebook og:description
      const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
      if (ogDescMatch && ogDescMatch[1]) {
        description = decodeHtmlEntities(ogDescMatch[1]);
        console.log('Found Facebook description:', description.substring(0, 100));
      }
      
      // Try alternate description
      if (!description) {
        const altDescMatch = html.match(/<meta name="description" content="([^"]+)"/i);
        if (altDescMatch && altDescMatch[1]) {
          description = decodeHtmlEntities(altDescMatch[1]);
        }
      }
      
      // Facebook og:image for thumbnail
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
      if (ogImageMatch && ogImageMatch[1]) {
        thumbnail_url = decodeHtmlEntities(ogImageMatch[1]);
        console.log('Found Facebook thumbnail');
      }
      
      // Try video thumbnail
      if (!thumbnail_url) {
        const videoThumbMatch = html.match(/<meta property="og:video:thumbnail" content="([^"]+)"/i);
        if (videoThumbMatch) thumbnail_url = videoThumbMatch[1];
      }
      
      // Get better title from og:title
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = decodeHtmlEntities(ogTitleMatch[1]).replace(' | Facebook', '').trim();
      }
      
      // Try to extract uploader name
      const uploaderMatch = html.match(/<meta property="og:site_name" content="([^"]+)"/i);
      if (uploaderMatch && uploaderMatch[1]) {
        uploader = uploaderMatch[1];
      }
      
      if (!uploader) uploader = 'Facebook';
      if (!title || title === 'Facebook') {
        title = description.substring(0, 50) || 'Facebook Video';
      }
      
      console.log('Facebook metadata extracted:', { title: title.substring(0, 50), uploader, hasThumb: !!thumbnail_url, hasDesc: !!description });
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
