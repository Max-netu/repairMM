Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const url = new URL(req.url);
    const ticketId = url.searchParams.get('id');

    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Fetch ticket
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
    if (payload.role === 'club' && ticket.club_id !== payload.clubId) {
      throw new Error('Not authorized to view this ticket');
    }
    if (payload.role === 'technician' && ticket.assigned_technician_id !== payload.userId) {
      throw new Error('Not authorized to view this ticket');
    }

    // Fetch related data
    const [clubResponse, machineResponse, creatorResponse, attachmentsResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/clubs?id=eq.${ticket.club_id}`, {
        headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey}` }
      }),
      fetch(`${supabaseUrl}/rest/v1/machines?id=eq.${ticket.machine_id}`, {
        headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey}` }
      }),
      fetch(`${supabaseUrl}/rest/v1/users?id=eq.${ticket.created_by_user_id}`, {
        headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey}` }
      }),
      fetch(`${supabaseUrl}/rest/v1/ticket_attachments?ticket_id=eq.${ticketId}`, {
        headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey}` }
      })
    ]);

    const [clubs, machines, creators, attachments] = await Promise.all([
      clubResponse.json(),
      machineResponse.json(),
      creatorResponse.json(),
      attachmentsResponse.json()
    ]);

    let assignedTechnician = null;
    if (ticket.assigned_technician_id) {
      const techResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${ticket.assigned_technician_id}`,
        {
          headers: { 'apikey': serviceRoleKey!, 'Authorization': `Bearer ${serviceRoleKey}` }
        }
      );
      const techs = await techResponse.json();
      assignedTechnician = techs[0] || null;
    }

    const enrichedTicket = {
      ...ticket,
      club: clubs[0],
      machine: machines[0],
      created_by: creators[0],
      assigned_technician: assignedTechnician,
      attachments
    };

    return new Response(JSON.stringify({
      data: { ticket: enrichedTicket }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'TICKET_DETAIL_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
