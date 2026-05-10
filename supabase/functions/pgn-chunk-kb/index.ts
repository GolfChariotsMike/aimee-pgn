import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;

    const { article_id } = await req.json();
    if (!article_id) {
      return new Response(JSON.stringify({ error: 'article_id required' }), { status: 400, headers: corsHeaders });
    }

    // Fetch article
    const articleRes = await fetch(`${SUPABASE_URL}/rest/v1/pgn_kb_articles?id=eq.${article_id}&select=*`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const articles = await articleRes.json();
    const article = articles[0];
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), { status: 404, headers: corsHeaders });
    }

    // Split into chunks ~500 chars at sentence boundaries
    const sentences = article.content.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = '';
    for (const s of sentences) {
      if ((current + ' ' + s).length > 500 && current) {
        chunks.push(current.trim());
        current = s;
      } else {
        current += (current ? ' ' : '') + s;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    if (chunks.length === 0) {
      return new Response(JSON.stringify({ ok: true, chunks: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Embed all chunks via OpenAI
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: chunks })
    });
    const embedData = await embedRes.json();

    if (!embedData.data) {
      return new Response(JSON.stringify({ error: 'Embedding failed', detail: embedData }), { status: 500, headers: corsHeaders });
    }

    // Delete old chunks
    await fetch(`${SUPABASE_URL}/rest/v1/pgn_kb_chunks?article_id=eq.${article_id}`, {
      method: 'DELETE',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });

    // Insert new chunks
    const newChunks = chunks.map((content, i) => ({
      article_id,
      content,
      embedding: embedData.data[i].embedding
    }));

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/pgn_kb_chunks`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(newChunks)
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return new Response(JSON.stringify({ error: 'Insert failed', detail: errText }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, chunks: chunks.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
