Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({
        error: {
          code: 'INVALID_INPUT',
          message: 'Email and password are required'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Get user from database
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
      }
    });

    const users = await userResponse.json();
    
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const user = users[0];

    // Simple password verification (SHA-256 hash)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (user.password_hash !== hashHex) {
      return new Response(JSON.stringify({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create JWT token (simple version for MVP)
    const token = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      clubId: user.club_id,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));

    // Return user data without password
    const { password_hash, ...userData } = user;

    return new Response(JSON.stringify({
      data: {
        token,
        user: userData
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'AUTH_ERROR',
        message: error.message || 'Authentication error'
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});