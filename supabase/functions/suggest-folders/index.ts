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

    const prompt = `You are a specialized video organization assistant. Your ONLY job is to analyze video content and suggest highly specific, meaningful folder names.

VIDEO INFORMATION:
Title: ${title}
Description: ${description || 'NO DESCRIPTION PROVIDED'}
Tags: ${tags?.join(', ') || 'none'}

CRITICAL INSTRUCTIONS:
1. READ THE DESCRIPTION CAREFULLY - This is your PRIMARY source for understanding the video content
2. If description is empty or generic, use the title to infer specific content
3. BE EXTREMELY SPECIFIC - Extract the exact niche, topic, or category:
   ❌ BAD: "Food", "Entertainment", "Videos", "General", "Educational"
   ✅ GOOD: "Italian Pasta Recipes", "HIIT Cardio Workouts", "iPhone Photography Tips", "Ancient Roman History"

4. Focus on these specificity levels (in priority order):
   - Exact niche (e.g., "Sourdough Bread Baking" not "Baking")
   - Sub-category (e.g., "Street Photography" not "Photography")
   - Genre/Style (e.g., "Synthwave Music" not "Music")
   - Platform/Format (e.g., "TikTok Dance Challenges" not "Dancing")

5. Keep names 2-4 words, practical for organizing similar content
6. Return ONLY a valid JSON array of 5 strings, nothing else

EXAMPLES:
For "How to make authentic Italian carbonara pasta with guanciale":
["Italian Pasta Recipes", "Authentic Italian Cooking", "Traditional Recipes", "Quick Italian Meals", "Carbonara Tutorials"]

For "10-minute morning HIIT workout for fat burning":
["HIIT Workouts", "Morning Exercise", "Fat Burning Cardio", "Quick Home Workouts", "Bodyweight Training"]

For "Beginner's guide to iPhone 15 Pro camera features":
["iPhone Photography", "Mobile Camera Tips", "iPhone 15 Pro", "Smartphone Photography", "Camera Tutorial"]

NOW ANALYZE THE VIDEO ABOVE AND RETURN ONLY THE JSON ARRAY:`;

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
    let content = data.choices[0].message.content;
    
    // Remove markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const suggestions = JSON.parse(content);

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
