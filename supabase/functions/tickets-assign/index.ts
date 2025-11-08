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

    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }

    // Only admins can assign tickets
    if (payload.role !== 'admin') {
      throw new Error('Only admins can assign tickets');
    }

    const { ticketId, technicianId } = await req.json();

    if (!ticketId || !technicianId) {
      throw new Error('Ticket ID and Technician ID are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Verify technician exists and has correct role
    const techResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${technicianId}&role=eq.technician`,
      {
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
        }
      }
    );

    const technicians = await techResponse.json();
    if (!technicians || technicians.length === 0) {
      throw new Error('Technician not found');
    }

    // Update ticket assignment
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
        body: JSON.stringify({
          assigned_technician_id: technicianId,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to assign ticket: ${error}`);
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
        code: 'TICKET_ASSIGN_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
