import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Request validation limits
const MAX_PAYLOAD_BYTES = 50 * 1024; // 50 KB
const MAX_MESSAGES_COUNT = 20;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_SYSTEM_PROMPT_LENGTH = 2000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let currentUserId: string | null = null;
  let supabaseClient: any = null;

  try {
    // 1. AUTHENTICATION CHECK via Supabase JWT Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    supabaseClient = supabase;

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    currentUserId = user.id;

    // 2. SERVER-AUTHORITATIVE RATE LIMITING
    // Resolve user tier from profiles table to set daily limit (Free: 50, Premium: 200, Elite: 500)
    let dailyLimit = 50;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle();

      const tier = profile?.subscription_tier || 'free';
      if (tier === 'premium') dailyLimit = 200;
      else if (tier === 'elite') dailyLimit = 500;
    } catch {
      // Conservative default if profiles query fails
      dailyLimit = 50;
    }

    // Atomic DB-safe rate limit check & increment via check_and_increment_ai_usage RPC
    let usageAllowed = true;
    let rateLimitInfo: any = {};
    try {
      const { data: usageData, error: rpcError } = await supabase
        .rpc('check_and_increment_ai_usage', {
          p_user_id: user.id,
          p_daily_limit: dailyLimit
        });

      if (!rpcError && usageData) {
        usageAllowed = !!usageData.allowed;
        rateLimitInfo = usageData;
      }
    } catch {
      // If RPC is pending database migration, fail-safe open to avoid breaking app
      usageAllowed = true;
    }

    if (!usageAllowed) {
      return new Response(
        JSON.stringify({
          error: `Daily AI request limit reached (${rateLimitInfo.current_count ?? dailyLimit}/${dailyLimit}). Upgrade or try again tomorrow.`,
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. SERVER-SIDE GEMINI SECRET & CONFIGURATION
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    const rawModel = Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash'
    const geminiModel = rawModel.replace(/^models\//, '').trim() || 'gemini-3.8-flash'
    const geminiBase = 'https://generativelanguage.googleapis.com/v1beta/models'

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. PAYLOAD SIZE & INPUT VALIDATION
    const rawBody = await req.text()
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      return new Response(
        JSON.stringify({ error: 'Payload too large. Request exceeds maximum allowed size.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let parsed
    try {
      parsed = JSON.parse(rawBody)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { messages, systemPrompt } = parsed

    if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'System prompt exceeds maximum length limit.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages must be a non-empty array.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (messages.length > MAX_MESSAGES_COUNT) {
      return new Response(
        JSON.stringify({ error: `Message count exceeds limit of ${MAX_MESSAGES_COUNT}.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const contents = []
    if (systemPrompt && typeof systemPrompt === 'string') {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] })
      contents.push({ role: 'model', parts: [{ text: 'Understood. Ready to assist.' }] })
    }

    for (const m of messages) {
      if (!m || typeof m !== 'object' || !m.text || typeof m.text !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Malformed message item.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (m.text.length > MAX_MESSAGE_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Individual message exceeds max character limit of ${MAX_MESSAGE_LENGTH}.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const role = (m.role === 'model' || m.role === 'assistant') ? 'model' : 'user'
      contents.push({ role, parts: [{ text: m.text }] })
    }

    // 5. CALL PRIMARY GEMINI MODEL SERVER-TO-SERVER
    let res = await fetch(`${geminiBase}/${geminiModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({ contents })
    })

    // If configured model returns 404 (deprecated/not found) or 503 (temporarily overloaded),
    // iterate fallback models.
    // NEVER fallback on 400 (malformed request), 401/403 (invalid key), or 429 (upstream quota).
    if (res.status === 404 || res.status === 503) {
      const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.5-flash']
      for (const fallback of FALLBACK_MODELS) {
        if (fallback === geminiModel) continue; // Skip model that already failed
        res = await fetch(`${geminiBase}/${fallback}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({ contents })
        })
        if (res.ok) break;
        if (res.status !== 404 && res.status !== 503) break;
      }
    }

    // Handle upstream failure: decrement user count so failure is not charged
    if (!res.ok) {
      try {
        if (currentUserId && supabaseClient) {
          await supabaseClient.rpc('decrement_ai_usage', { p_user_id: currentUserId });
        }
      } catch {
        // Ignore decrement errors
      }

      const status = res.status
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Upstream rate limit reached. Please try again in a minute.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ error: 'AI request processing error.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (_error) {
    // Decrement count on unexpected exception
    try {
      if (currentUserId && supabaseClient) {
        await supabaseClient.rpc('decrement_ai_usage', { p_user_id: currentUserId });
      }
    } catch {
      // Ignore
    }

    return new Response(
      JSON.stringify({ error: 'Internal AI processing error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
