import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const customQuestionResponseSchema = z.object({
  question_id: z.string().uuid(),
  answer: z.string()
    .min(1, "Answer cannot be empty")
    .max(5000, "Answer must be less than 5000 characters")
    .refine(
      (val) => {
        // Basic XSS prevention - reject common attack patterns
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i, // onclick, onload, etc.
          /<iframe/i,
          /eval\(/i,
        ];
        return !dangerousPatterns.some(pattern => pattern.test(val));
      },
      { message: "Invalid characters detected in answer" }
    ),
});

const surveyResponseSchema = z.object({
  survey_template_id: z.string().uuid(),
  role: z.string()
    .max(200, "Role must be less than 200 characters")
    .optional()
    .nullable(),
  leadership_prioritize: z.string().max(50).optional().nullable(),
  manageable_workload: z.string().max(50).optional().nullable(),
  work_life_balance: z.string().max(50).optional().nullable(),
  health_state: z.string().max(50).optional().nullable(),
  valued_member: z.string().max(50).optional().nullable(),
  support_access: z.string().max(50).optional().nullable(),
  confidence_in_role: z.string().max(50).optional().nullable(),
  org_pride: z.string().max(50).optional().nullable(),
  recommendation_score: z.string().max(50).optional().nullable(),
  leaving_contemplation: z.string().max(50).optional().nullable(),
  doing_well: z.string()
    .max(5000, "Response must be less than 5000 characters")
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i];
        return !dangerousPatterns.some(pattern => pattern.test(val));
      },
      { message: "Invalid characters detected" }
    ),
  improvements: z.string()
    .max(5000, "Response must be less than 5000 characters")
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i];
        return !dangerousPatterns.some(pattern => pattern.test(val));
      },
      { message: "Invalid characters detected" }
    ),
  custom_responses: z.array(customQuestionResponseSchema).optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate request body
    const body = await req.json();
    console.log('Validating survey response submission');
    
    const validatedData = surveyResponseSchema.parse(body);
    console.log('Survey response validation passed');

    // Verify survey exists and is open
    const { data: survey, error: surveyError } = await supabase
      .from('survey_templates')
      .select('id, status, close_date')
      .eq('id', validatedData.survey_template_id)
      .single();

    if (surveyError || !survey) {
      console.error('Survey not found:', surveyError);
      return new Response(
        JSON.stringify({ error: 'Survey not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if survey is open
    const now = new Date();
    const closeDate = survey.close_date ? new Date(survey.close_date) : null;
    const isOpen = survey.status === 'Sent' && (!closeDate || closeDate > now);

    if (!isOpen) {
      console.log('Survey is closed');
      return new Response(
        JSON.stringify({ error: 'Survey is no longer accepting responses' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize text fields (trim whitespace)
    const sanitizedResponse = {
      survey_template_id: validatedData.survey_template_id,
      role: validatedData.role?.trim() || null,
      leadership_prioritize: validatedData.leadership_prioritize?.trim() || null,
      manageable_workload: validatedData.manageable_workload?.trim() || null,
      work_life_balance: validatedData.work_life_balance?.trim() || null,
      health_state: validatedData.health_state?.trim() || null,
      valued_member: validatedData.valued_member?.trim() || null,
      support_access: validatedData.support_access?.trim() || null,
      confidence_in_role: validatedData.confidence_in_role?.trim() || null,
      org_pride: validatedData.org_pride?.trim() || null,
      recommendation_score: validatedData.recommendation_score?.trim() || null,
      leaving_contemplation: validatedData.leaving_contemplation?.trim() || null,
      doing_well: validatedData.doing_well?.trim() || null,
      improvements: validatedData.improvements?.trim() || null,
    };

    // Insert survey response
    const { data: responseData, error: responseError } = await supabase
      .from('survey_responses')
      .insert(sanitizedResponse)
      .select()
      .single();

    if (responseError) {
      console.error('Error inserting survey response:', responseError);
      return new Response(
        JSON.stringify({ error: 'Failed to save survey response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Survey response created:', responseData.id);

    // Insert custom question responses if provided
    if (validatedData.custom_responses && validatedData.custom_responses.length > 0) {
      const customResponses = validatedData.custom_responses.map(cr => ({
        response_id: responseData.id,
        question_id: cr.question_id,
        answer: cr.answer.trim(),
      }));

      const { error: customError } = await supabase
        .from('custom_question_responses')
        .insert(customResponses);

      if (customError) {
        console.error('Error inserting custom question responses:', customError);
        // Don't fail the entire request if custom responses fail
        // The main survey response is already saved
      } else {
        console.log(`Inserted ${customResponses.length} custom question responses`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        response_id: responseData.id,
        message: 'Survey response submitted successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Survey submission error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generic error response (don't expose internal details)
    return new Response(
      JSON.stringify({ error: 'An error occurred while submitting your response' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});