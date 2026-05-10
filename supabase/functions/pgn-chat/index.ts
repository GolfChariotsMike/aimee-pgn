import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info'
};

const SYSTEM_PROMPT = `You are AImee, the friendly AI assistant for Perth Golf Network — WA's biggest and best social golf club. You help members and prospective members with questions about competitions, membership, bookings, courses, events, and anything else related to PGN. Keep responses friendly, helpful and concise. If you don't know something, suggest they contact PGN directly at info@perthgolfnetwork.com.au or (08) 6285 5822. Never make up information.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;

    const { message, session_id, history = [] } = await req.json();
    if (!message || !session_id) {
      return new Response(JSON.stringify({ error: 'message and session_id required' }), { status: 400, headers: corsHeaders });
    }

    // 1. Embed the user message
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: message })
    });
    const embedData = await embedRes.json();
    const queryEmbedding = embedData.data[0].embedding;

    // 2. Search for similar KB chunks via RPC
    const searchRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pgn_match_chunks`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query_embedding: queryEmbedding,
        match_count: 5,
        match_threshold: 0.3
      })
    });

    let contextChunks: string[] = [];
    if (searchRes.ok) {
      const chunks = await searchRes.json();
      if (Array.isArray(chunks)) {
        contextChunks = chunks.map((c: any) => c.content);
      }
    }

    const contextText = contextChunks.length > 0
      ? `\n\nRelevant information from Perth Golf Network's knowledge base:\n${contextChunks.map((c, i) => `[${i+1}] ${c}`).join('\n\n')}`
      : '';

    // 3. Build messages for OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + contextText },
      ...history.slice(-10), // last 10 messages for context
      { role: 'user', content: message }
    ];

    // 4. Call OpenAI gpt-4o-mini
    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 600
      })
    });
    const chatData = await chatRes.json();
    const assistantMessage = chatData.choices?.[0]?.message?.content || 'Sorry, I had trouble responding. Please try again.';

    // 5. Save conversation + messages to DB
    // Find or create conversation for session_id
    let conversationId: string;

    const convRes = await fetch(`${SUPABASE_URL}/rest/v1/pgn_conversations?session_id=eq.${session_id}&select=id`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const convs = await convRes.json();

    if (convs.length > 0) {
      conversationId = convs[0].id;
    } else {
      const newConvRes = await fetch(`${SUPABASE_URL}/rest/v1/pgn_conversations`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([{ session_id }])
      });
      const newConvs = await newConvRes.json();
      conversationId = newConvs[0].id;
    }

    // Insert user + assistant messages
    await fetch(`${SUPABASE_URL}/rest/v1/pgn_messages`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify([
        { conversation_id: conversationId, role: 'user', content: message },
        { conversation_id: conversationId, role: 'assistant', content: assistantMessage }
      ])
    });

    return new Response(JSON.stringify({
      message: assistantMessage,
      conversation_id: conversationId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
