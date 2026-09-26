
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { requireUser } from "../_shared/auth.ts";
import { HttpError } from "../_shared/http.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Logged-in users only: this spends OpenAI credit.
    try {
      await requireUser(req);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { recommendationScore, leavingContemplation } = body;
    // Cap what goes into the prompt so one request can't run up a large bill.
    const detailedResponses = Array.isArray(body.detailedResponses) ? body.detailedResponses.slice(0, 50) : [];
    const capText = (items: unknown) =>
      (Array.isArray(items) ? items : []).slice(0, 300).map((r: any) => ({ ...r, response: String(r?.response ?? '').slice(0, 1000) }));
    const textResponses = {
      doingWell: capText(body.textResponses?.doingWell),
      improvements: capText(body.textResponses?.improvements),
    };

    // Check if we have enough data (10 responses minimum)
    // Instead of using leavingContemplation, let's use detailedResponses for consistency
    let totalResponses = 0;
    
    if (detailedResponses && detailedResponses.length > 0) {
      // Calculate from the first question's responses
      const firstQuestion = detailedResponses[0];
      if (firstQuestion && firstQuestion.schoolResponses) {
        // Calculate total by estimating from percentages
        // We know these values add up to 1 (100%), so we need to calculate what raw number that represents
        const totalPercentage = Object.values(firstQuestion.schoolResponses).reduce((sum: number, value: number) => sum + value, 0);
        // If we have 10 responses and each response is counted in schoolResponses, then totalPercentage should be 1.0
        if (totalPercentage > 0) {
          // Estimate the total responses
          totalResponses = Math.round(100 * totalPercentage); // This won't be exact but gives us a better estimate
        }
      }
    }
    
    console.log("Estimated total responses:", totalResponses);
    
    // If insufficient data, return early
    if (totalResponses < 10) {
      console.log("Insufficient data for summary, returning early");
      return new Response(JSON.stringify({ insufficientData: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare the data for the OpenAI API
    const detailedResponsesText = detailedResponses.map((question: any) => {
      const schoolPositive = (question.schoolResponses["Strongly Agree"] || 0) + 
                           (question.schoolResponses["Agree"] || 0);
      const schoolNegative = (question.schoolResponses["Disagree"] || 0) + 
                           (question.schoolResponses["Strongly Disagree"] || 0);

      return `Question: ${question.question}
      Positive responses: ${schoolPositive}%
      Negative responses: ${schoolNegative}%`;
    }).join('\n\n');

    const leavingContemplationText = Object.entries(leavingContemplation)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    const doingWellResponses = textResponses.doingWell
      .map((item: any) => item.response)
      .join('\n- ');

    const improvementsResponses = textResponses.improvements
      .map((item: any) => item.response)
      .join('\n- ');

    // Create a prompt for the OpenAI API - updated to request only 3 bullet points
    const prompt = `
    You are an educational analyst reviewing staff wellbeing survey data. Analyze the following data and provide:
    1. 3 bullet points highlighting areas of strength (no more than 3)
    2. 3 bullet points highlighting areas for improvement/development (no more than 3)
    
    SURVEY DATA:
    Recommendation Score: ${recommendationScore.score} (National Average: ${recommendationScore.nationalAverage})
    
    Staff Contemplating Leaving: 
    ${leavingContemplationText}
    
    Detailed Question Responses:
    ${detailedResponsesText}
    
    What the organization does well (free text responses):
    - ${doingWellResponses}
    
    What the organization could improve (free text responses):
    - ${improvementsResponses}
    
    FORMAT YOUR RESPONSE IN THIS EXACT FORMAT:
    {
      "introduction": "A brief paragraph summarizing the overall findings...",
      "strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "improvements": ["Area for improvement 1", "Area for improvement 2", "Area for improvement 3"]
    }

    Only include strengths and improvements that are clearly supported by the data. Keep bullet points concise, actionable, and limited to exactly 3 in each category.
    `;

    // Call the OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an educational analyst reviewing staff wellbeing survey data.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API error:', data.error);
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    try {
      const aiResponse = data.choices[0].message.content;
      console.log("Received AI response, parsing...");
      // Parse the JSON response
      const parsedResponse = JSON.parse(aiResponse);
      
      return new Response(JSON.stringify(parsedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Raw response:', data.choices[0].message.content);
      
      // If parsing fails, return a structured error response
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response',
        rawResponse: data.choices[0].message.content
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
