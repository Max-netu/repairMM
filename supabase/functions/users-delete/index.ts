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

        const { user_id } = await req.json();

        if (!user_id) {
            throw new Error('User ID is required');
        }

        // Prevent admin from deleting themselves
        if (user_id === payload.userId) {
            throw new Error('Cannot delete your own account');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Check if user exists and get their role
        const getUserResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user_id}`, {
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
            }
        });

        const users = await getUserResponse.json();
        if (!users || users.length === 0) {
            throw new Error('User not found');
        }

        const userToDelete = users[0];

        // Check if user has associated tickets
        const ticketsResponse = await fetch(`${supabaseUrl}/rest/v1/tickets?created_by_user_id=eq.${user_id}`, {
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
            }
        });

        const tickets = await ticketsResponse.json();
        if (tickets && tickets.length > 0) {
            throw new Error('Cannot delete user who has associated tickets. Please reassign or delete the tickets first.');
        }

        // Check if user is assigned as technician to any tickets
        const assignedTicketsResponse = await fetch(`${supabaseUrl}/rest/v1/tickets?assigned_technician_id=eq.${user_id}`, {
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
            }
        });

        const assignedTickets = await assignedTicketsResponse.json();
        if (assignedTickets && assignedTickets.length > 0) {
            throw new Error('Cannot delete user who is assigned to tickets. Please reassign the tickets first.');
        }

        // Delete user
        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
            }
        });

        if (!deleteResponse.ok) {
            const error = await deleteResponse.text();
            throw new Error(`Failed to delete user: ${error}`);
        }

        return new Response(JSON.stringify({ 
            data: { 
                message: 'User deleted successfully',
                deleted_user: {
                    id: userToDelete.id,
                    name: userToDelete.name,
                    email: userToDelete.email,
                    role: userToDelete.role
                }
            } 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // Return error response
        const errorResponse = {
            error: {
                code: 'USER_DELETE_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});