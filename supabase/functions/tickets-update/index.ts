Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
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

    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }

    const { ticketId, status, priority } = await req.json();

    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Get ticket to verify authorization
    const ticketResponse = await fetch(
      `${supabaseUrl}/rest/v1/tickets?id=eq.${ticketId}`,
      {
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
        }
      }
    );

    const tickets = await ticketResponse.json();
    if (!tickets || tickets.length === 0) {
      throw new Error('Ticket not found');
    }

    const ticket = tickets[0];

    // Check authorization
    if (payload.role === 'technician' && ticket.assigned_technician_id !== payload.userId) {
      throw new Error('Not authorized to update this ticket');
    }
    if (payload.role === 'club' && ticket.club_id !== payload.clubId) {
      throw new Error('Not authorized to update this ticket');
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updates.status = status;
      if (status === 'closed') {
        updates.closed_at = new Date().toISOString();
      }
    }

    if (priority && payload.role === 'admin') {
      updates.priority = priority;
    }

    // Update ticket
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/tickets?id=eq.${ticketId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updates)
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update ticket: ${error}`);
    }

    const updatedTickets = await updateResponse.json();

    return new Response(JSON.stringify({
      data: { ticket: updatedTickets[0] }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'TICKET_UPDATE_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
