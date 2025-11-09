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
    const status = url.searchParams.get('status');
    const clubId = url.searchParams.get('clubId');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Build query based on user role
    let queryUrl = `${supabaseUrl}/rest/v1/tickets?select=*&order=created_at.desc`;

    if (payload.role === 'club') {
      // Club users see only their club's tickets
      queryUrl += `&club_id=eq.${payload.clubId}`;
    } else if (payload.role === 'technician') {
      // Technicians see only assigned tickets
      queryUrl += `&assigned_technician_id=eq.${payload.userId}`;
    }
    // Admins see all tickets (no filter)

    // Apply additional filters
    if (status) {
      queryUrl += `&status=eq.${status}`;
    }
    if (clubId && payload.role === 'admin') {
      queryUrl += `&club_id=eq.${clubId}`;
    }

    const ticketsResponse = await fetch(queryUrl, {
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
      }
    });

    if (!ticketsResponse.ok) {
      throw new Error('Failed to fetch tickets');
    }

    const tickets = await ticketsResponse.json();

    // Fetch related data (clubs, machines, users)
    if (tickets.length > 0) {
      const clubIds = [...new Set(tickets.map((t: any) => t.club_id))];
      const machineIds = [...new Set(tickets.map((t: any) => t.machine_id))];
      const userIds = [...new Set(tickets.map((t: any) => t.created_by_user_id).concat(
        tickets.map((t: any) => t.assigned_technician_id).filter((id: any) => id !== null)
      ))];

      // Fetch clubs
      const clubsResponse = await fetch(
        `${supabaseUrl}/rest/v1/clubs?id=in.(${clubIds.join(',')})`,
        {
          headers: {
            'apikey': serviceRoleKey!,
            'Authorization': `Bearer ${serviceRoleKey}`,
          }
        }
      );
      const clubs = await clubsResponse.json();

      // Fetch machines
      const machinesResponse = await fetch(
        `${supabaseUrl}/rest/v1/machines?id=in.(${machineIds.join(',')})`,
        {
          headers: {
            'apikey': serviceRoleKey!,
            'Authorization': `Bearer ${serviceRoleKey}`,
          }
        }
      );
      const machines = await machinesResponse.json();

      // Fetch users
      const usersResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=in.(${userIds.join(',')})`,
        {
          headers: {
            'apikey': serviceRoleKey!,
            'Authorization': `Bearer ${serviceRoleKey}`,
          }
        }
      );
      const users = await usersResponse.json();

      // Enrich tickets with related data
      const enrichedTickets = tickets.map((ticket: any) => ({
        ...ticket,
        club: clubs.find((c: any) => c.id === ticket.club_id),
        machine: machines.find((m: any) => m.id === ticket.machine_id),
        created_by: users.find((u: any) => u.id === ticket.created_by_user_id),
        assigned_technician: users.find((u: any) => u.id === ticket.assigned_technician_id)
      }));

      return new Response(JSON.stringify({
        data: { tickets: enrichedTickets }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      data: { tickets: [] }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'TICKETS_LIST_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});