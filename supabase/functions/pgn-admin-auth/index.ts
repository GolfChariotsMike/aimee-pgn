import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET') || 'pgn-aimee-secret-2026';

    const { email, password, action } = await req.json();

    // Handle password change action
    if (action === 'change_password') {
      const { token, new_password } = await req.json().catch(() => ({ token: null, new_password: null }));
      // Simplified: just return ok for now
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email and password required' }), { status: 400, headers: corsHeaders });
    }

    // Fetch user
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/pgn_admin_users?email=eq.${encodeURIComponent(email)}&select=*`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const users = await userRes.json();
    const user = users[0];

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: corsHeaders });
    }

    // Create JWT
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const token = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        exp: Math.floor(Date.now() / 1000) + 86400 // 24h
      },
      key
    );

    return new Response(JSON.stringify({ token, user: { id: user.id, email: user.email, name: user.name } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
