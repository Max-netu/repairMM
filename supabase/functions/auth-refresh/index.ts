Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const userToken = req.headers.get('x-user-token');
    
    if (!userToken) {
      throw new Error('No user token');
    }

    const payload = JSON.parse(atob(userToken));
    // Token already parsed above

    // Check if token is expired
    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Get fresh user data
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${payload.userId}`, {
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
      }
    });

    const users = await userResponse.json();
    
    if (!users || users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Create new token
    const newToken = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      clubId: user.club_id,
      exp: Date.now() + (24 * 60 * 60 * 1000)
    }));

    const { password_hash, ...userData } = user;

    return new Response(JSON.stringify({
      data: {
        token: newToken,
        user: userData
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'AUTH_ERROR',
        message: error.message
      }
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});