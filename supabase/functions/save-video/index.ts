import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { url, title, platform, thumbnail_url, folder_id, tags, note, mood, source_raw } = await req.json();

    if (!url || !title || !platform) {
      throw new Error('Missing required fields: url, title, platform');
    }

    // Get AI folder suggestion if no folder selected
    let suggestedFolderId = folder_id;
    if (!folder_id) {
      try {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (LOVABLE_API_KEY) {
          const { data: folders } = await supabaseClient
            .from('folders')
            .select('id, name')
            .eq('user_id', user.id);

          if (folders && folders.length > 0) {
            const folderNames = folders.map(f => f.name).join(', ');
            
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [{
                  role: 'user',
                  content: `Given video title: "${title}" and existing folders: ${folderNames}, which folder name best matches? Reply with ONLY the exact folder name, nothing else. If no good match, reply "none".`
                }],
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const suggestion = aiData.choices?.[0]?.message?.content?.trim();
              const matchedFolder = folders.find(f => f.name === suggestion);
              if (matchedFolder) {
                suggestedFolderId = matchedFolder.id;
              }
            }
          }
        }
      } catch (aiError) {
        console.error('AI suggestion error:', aiError);
        // Continue without AI suggestion
      }
    }

    // Insert video
    const { data: video, error: insertError } = await supabaseClient
      .from('videos')
      .insert({
        user_id: user.id,
        url,
        title,
        platform,
        thumbnail_path: thumbnail_url || null,
        folder_id: suggestedFolderId || null,
        tags: tags || [],
        note: note || null,
        mood: mood || null,
        source_raw: source_raw || {},
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log analytics event
    await supabaseClient.from('events').insert({
      user_id: user.id,
      event_type: 'save_video',
      payload: { video_id: video.id, platform },
    });

    return new Response(JSON.stringify({ success: true, video }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in save-video:', error);
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
