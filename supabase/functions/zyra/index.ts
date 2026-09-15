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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. SERVER-SIDE GEMINI SECRET & CONFIGURATION
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash'
    const geminiBase = 'https://generativelanguage.googleapis.com/v1beta/models'

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. PAYLOAD SIZE VALIDATION
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

    // 4. INPUT & BOUND VALIDATION
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

    // 5. CALL GEMINI SERVER-TO-SERVER
    const res = await fetch(`${geminiBase}/${geminiModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    })

    if (!res.ok) {
      const status = res.status
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Dex needs a breather! Please try again in a minute.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ error: 'AI request processing error.' }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Sanitized server error
    return new Response(
      JSON.stringify({ error: 'Internal AI processing error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
