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
    const { title, tags, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Based on this video information, suggest 5 specific, meaningful folder names that would be good for organizing it:
    
Title: ${title}
Description: ${description || 'none'}
Tags: ${tags?.join(', ') || 'none'}

Requirements:
- Analyze the CONTENT and TOPIC of the video carefully
- Be VERY SPECIFIC based on the description (e.g., "Italian Pasta Recipes" not just "Food", "HIIT Cardio Workouts" not just "Fitness")
- Use the video description as the PRIMARY source for understanding the content
- Keep names short (2-4 words max)
- Make them practical for organizing similar videos
- Avoid generic names like "Entertainment", "General", "Videos"
- Return ONLY a JSON array of strings, no other text

Example for a cooking video about Italian pasta:
["Italian Recipes", "Pasta Dishes", "Quick Dinners", "Mediterranean Cooking", "Homemade Pasta"]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that suggests organized folder names. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to get AI suggestions');
    }

    const data = await response.json();
    const suggestions = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in suggest-folders:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        suggestions: ['General', 'Entertainment', 'Educational', 'Music', 'Other'] // Fallback
      }),
      { 
        status: 200, // Return 200 with fallback
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
