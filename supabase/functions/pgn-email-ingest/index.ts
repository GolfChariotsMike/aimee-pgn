import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info'
};

function cleanEmailBody(body: string): string {
  // Remove common email signatures
  body = body.replace(/^[-—_]{2,}[\s\S]*$/m, ''); // signature separator
  body = body.replace(/^(From|To|Subject|Date|Sent):.*$/gm, ''); // email headers
  body = body.replace(/^>+.*/gm, ''); // quoted lines
  body = body.replace(/https?:\/\/[^\s]+/g, (url) => url); // keep URLs
  body = body.replace(/\n{3,}/g, '\n\n'); // collapse multiple newlines
  return body.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { subject, body, from } = await req.json();
    if (!subject || !body) {
      return new Response(JSON.stringify({ error: 'subject and body required' }), { status: 400, headers: corsHeaders });
    }

    const cleanedBody = cleanEmailBody(body);

    // Create KB article
    const articleRes = await fetch(`${SUPABASE_URL}/rest/v1/pgn_kb_articles`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([{
        title: subject,
        content: cleanedBody,
        source: 'email',
        source_email: from || null
      }])
    });

    const articles = await articleRes.json();
    const article = articles[0];

    if (!article?.id) {
      return new Response(JSON.stringify({ error: 'Failed to create article', detail: articles }), { status: 500, headers: corsHeaders });
    }

    // Trigger chunking
    const chunkRes = await fetch(`${SUPABASE_URL}/functions/v1/pgn-chunk-kb`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ article_id: article.id })
    });

    const chunkData = await chunkRes.json();

    return new Response(JSON.stringify({
      ok: true,
      article_id: article.id,
      title: subject,
      chunks: chunkData.chunks || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
