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

        const { name, email, password, role, club_id } = await req.json();

        if (!name || !email || !password || !role) {
            throw new Error('Name, email, password, and role are required');
        }

        if (!['admin', 'technician', 'club'].includes(role)) {
            throw new Error('Invalid role. Must be admin, technician, or club');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Check if email already exists
        const checkResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
            }
        });

        const existingUsers = await checkResponse.json();
        if (existingUsers && existingUsers.length > 0) {
            throw new Error('User with this email already exists');
        }

        // Hash password using SHA-256
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Create new user
        const createResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                name,
                email,
                password_hash: passwordHash,
                role,
                club_id: club_id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        });

        if (!createResponse.ok) {
            const error = await createResponse.text();
            throw new Error(`Failed to create user: ${error}`);
        }

        const newUser = await createResponse.json();

        // Return success response (without password)
        const { password_hash, ...userData } = newUser[0];

        return new Response(JSON.stringify({ 
            data: { user: userData } 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // Return error response
        const errorResponse = {
            error: {
                code: 'USER_CREATE_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});