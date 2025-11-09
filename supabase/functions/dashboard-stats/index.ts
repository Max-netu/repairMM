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
    // Get custom user token from x-user-token header
    const userToken = req.headers.get('x-user-token');
    if (!userToken) {
      throw new Error('No user token header');
    }

    const payload = JSON.parse(atob(userToken));

    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Build query based on role
    let queryFilter = '';
    if (payload.role === 'club') {
      queryFilter = `club_id=eq.${payload.clubId}`;
    } else if (payload.role === 'technician') {
      queryFilter = `assigned_technician_id=eq.${payload.userId}`;
    }
    // Admin gets all tickets (no filter)

    const ticketsUrl = queryFilter 
      ? `${supabaseUrl}/rest/v1/tickets?${queryFilter}`
      : `${supabaseUrl}/rest/v1/tickets`;

    const ticketsResponse = await fetch(ticketsUrl, {
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
      }
    });

    const tickets = await ticketsResponse.json();

    // Calculate statistics
    const stats = {
      total: tickets.length,
      novo: tickets.filter((t: any) => t.status === 'novo').length,
      u_tijeku: tickets.filter((t: any) => t.status === 'u_tijeku').length,
      'čeka se rezervni dio': tickets.filter((t: any) => t.status === 'čeka se rezervni dio').length,
      'čeka se porezna': tickets.filter((t: any) => t.status === 'čeka se porezna').length,
      zatvoreno: tickets.filter((t: any) => t.status === 'zatvoreno').length,
      by_status: {
        novo: tickets.filter((t: any) => t.status === 'novo').length,
        u_tijeku: tickets.filter((t: any) => t.status === 'u_tijeku').length,
        'čeka se rezervni dio': tickets.filter((t: any) => t.status === 'čeka se rezervni dio').length,
        'čeka se porezna': tickets.filter((t: any) => t.status === 'čeka se porezna').length,
        zatvoreno: tickets.filter((t: any) => t.status === 'zatvoreno').length,
      }
    };

    // For admin, add club breakdown
    if (payload.role === 'admin') {
      const clubIds = [...new Set(tickets.map((t: any) => t.club_id))];
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

      const byClub = clubIds.map(clubId => {
        const clubTickets = tickets.filter((t: any) => t.club_id === clubId);
        const club = clubs.find((c: any) => c.id === clubId);
        return {
          club_id: clubId,
          club_name: club?.name || 'Unknown',
          total: clubTickets.length,
          novo: clubTickets.filter((t: any) => t.status === 'novo').length,
          u_tijeku: clubTickets.filter((t: any) => t.status === 'u_tijeku').length,
          zatvoreno: clubTickets.filter((t: any) => t.status === 'zatvoreno').length,
        };
      });

      stats.by_club = byClub;
    }

    return new Response(JSON.stringify({
      data: { stats }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'DASHBOARD_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});