Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Get custom user token from x-user-token header
        const userToken = req.headers.get('x-user-token');
        if (!userToken) {
            throw new Error('No user token header');
        }

        const payload = JSON.parse(atob(userToken));

        if (payload.exp < Date.now()) {
            throw new Error('Token expired');
        }

        // Verify user is admin
        if (payload.role !== 'admin') {
            throw new Error('Access denied. Admin role required.');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Get all users with their club information
        const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=*,clubs(name,city)`, {
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Content-Type': 'application/json'
            }
        });

        if (!usersResponse.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await usersResponse.json();

        // Return success response
        return new Response(JSON.stringify({ 
            data: { users } 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // Return error response
        const errorResponse = {
            error: {
                code: 'USERS_LIST_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});