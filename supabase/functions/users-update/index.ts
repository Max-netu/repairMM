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

        const { user_id, name, email, password, role, club_id } = await req.json();

        if (!user_id) {
            throw new Error('User ID is required');
        }

        // Validate role if provided
        if (role && !['admin', 'technician', 'club'].includes(role)) {
            throw new Error('Invalid role. Must be admin, technician, or club');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Check if email already exists (excluding current user)
        if (email) {
            const checkResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&id=neq.${user_id}`, {
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                }
            });

            const existingUsers = await checkResponse.json();
            if (existingUsers && existingUsers.length > 0) {
                throw new Error('Another user with this email already exists');
            }
        }

        // Prepare update data
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (club_id !== undefined) updateData.club_id = club_id;

        if (password) {
            // Hash password using SHA-256
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            updateData.password_hash = passwordHash;
        }

        // Update user
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.text();
            throw new Error(`Failed to update user: ${error}`);
        }

        const updatedUser = await updateResponse.json();

        if (!updatedUser || updatedUser.length === 0) {
            throw new Error('User not found');
        }

        // Return success response (without password)
        const { password_hash, ...userData } = updatedUser[0];

        return new Response(JSON.stringify({ 
            data: { user: userData } 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // Return error response
        const errorResponse = {
            error: {
                code: 'USER_UPDATE_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});