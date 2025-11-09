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
      throw new Error('Nedostaje korisnički token');
    }

    const payload = JSON.parse(atob(userToken));

    if (payload.exp < Date.now()) {
      throw new Error('Token je istekao');
    }

    // Only allow admins to generate reports
    if (payload.role !== 'admin') {
      throw new Error('Samo admini mogu generirati tjedne izvještaje');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Get date range for the past week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get all tickets from the past week
    const ticketsResponse = await fetch(
      `${supabaseUrl}/rest/v1/tickets?created_at=gte.${weekStartStr}T00:00:00Z&order=created_at.desc`,
      {
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
        }
      }
    );

    if (!ticketsResponse.ok) {
      throw new Error('Neuspješno dohvaćanje zahtjeva');
    }

    const tickets = await ticketsResponse.json();

    // Get club information
    const clubsResponse = await fetch(`${supabaseUrl}/rest/v1/clubs`, {
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
      }
    });

    const clubs = await clubsResponse.json();
    const clubMap = {};
    clubs.forEach(club => {
      clubMap[club.id] = club;
    });

    // Get user information
    const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
      }
    });

    const users = await usersResponse.json();
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // Generate statistics
    const stats = {
      totalTickets: tickets.length,
      byStatus: {},
      byClub: {},
      byTechnician: {},
      createdThisWeek: tickets.filter(t => new Date(t.created_at) >= weekStart).length,
      closedThisWeek: tickets.filter(t => t.status === 'zatvoreno' && new Date(t.closed_at) >= weekStart).length,
      averageResolutionTime: 0
    };

    // Calculate statistics
    tickets.forEach(ticket => {
      // By status
      stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1;
      
      // By club
      const clubName = clubMap[ticket.club_id]?.name || 'Nepoznat';
      stats.byClub[clubName] = (stats.byClub[clubName] || 0) + 1;
      
      // By technician
      if (ticket.assigned_technician_id) {
        const techName = userMap[ticket.assigned_technician_id]?.name || 'Nedodijeljen';
        stats.byTechnician[techName] = (stats.byTechnician[techName] || 0) + 1;
      }
    });

    // Calculate average resolution time
    const resolvedTickets = tickets.filter(t => t.status === 'zatvoreno' && t.closed_at);
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at);
        const closed = new Date(t.closed_at);
        return sum + (closed - created);
      }, 0);
      stats.averageResolutionTime = Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60 * 24)); // Days
    }

    // Generate HTML report
    const htmlReport = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tjedni izvještaj - ${new Date().toLocaleDateString('hr-HR')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin: 20px 0; }
          .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          ul { list-style-type: none; padding: 0; }
          li { margin: 5px 0; padding: 8px; background: #f5f5f5; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Tjedni izvještaj zahtjeva za servis</h1>
          <p>Period: ${weekStartStr} - ${now.toISOString().split('T')[0]}</p>
          <p>Generiran: ${new Date().toLocaleString('hr-HR')}</p>
        </div>

        <div class="summary">
          <h2>Sažetak</h2>
          <p><strong>Ukupno zahtjeva:</strong> ${stats.totalTickets}</p>
          <p><strong>Kreirano ovaj tjedan:</strong> ${stats.createdThisWeek}</p>
          <p><strong>Zatvoreno ovaj tjedan:</strong> ${stats.closedThisWeek}</p>
          <p><strong>Prosječno vrijeme rješavanja:</strong> ${stats.averageResolutionTime} dana</p>
        </div>

        <div class="section">
          <h2>Zahtjevi po statusu</h2>
          <ul>
            ${Object.entries(stats.byStatus).map(([status, count]) => 
              `<li><strong>${status}:</strong> ${count}</li>`
            ).join('')}
          </ul>
        </div>

        <div class="section">
          <h2>Zahtjevi po klubovima</h2>
          <ul>
            ${Object.entries(stats.byClub).map(([club, count]) => 
              `<li><strong>${club}:</strong> ${count}</li>`
            ).join('')}
          </ul>
        </div>

        <div class="section">
          <h2>Zahtjevi po tehničarima</h2>
          <ul>
            ${Object.entries(stats.byTechnician).map(([tech, count]) => 
              `<li><strong>${tech}:</strong> ${count}</li>`
            ).join('')}
          </ul>
        </div>

        <div class="section">
          <h2>Detaljni popis zahtjeva</h2>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>
                <th>Broj</th>
                <th>Naslov</th>
                <th>Klub</th>
                <th>Status</th>
                <th>Zaposlenik</th>
                <th>Tehničar</th>
                <th>Kreiran</th>
                <th>Zatvoren</th>
              </tr>
            </thead>
            <tbody>
              ${tickets.map(ticket => `
                <tr>
                  <td>${ticket.request_number || 'N/A'}</td>
                  <td>${ticket.title}</td>
                  <td>${clubMap[ticket.club_id]?.name || 'Nepoznat'}</td>
                  <td>${ticket.status}</td>
                  <td>${ticket.employee_name || 'N/A'}</td>
                  <td>${userMap[ticket.assigned_technician_id]?.name || 'Nedodijeljen'}</td>
                  <td>${new Date(ticket.created_at).toLocaleDateString('hr-HR')}</td>
                  <td>${ticket.closed_at ? new Date(ticket.closed_at).toLocaleDateString('hr-HR') : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    return new Response(htmlReport, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'REPORT_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});