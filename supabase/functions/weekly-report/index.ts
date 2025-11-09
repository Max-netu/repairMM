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
      byPriority: {},
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
      
      // By priority
      stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;
      
      // By technician
      if (ticket.assigned_technician_id) {
        const techName = userMap[ticket.assigned_technician_id]?.name || 'Nedodijeljen';
        stats.byTechnician[techName] = (stats.byTechnician[techName] || 0) + 1;
      }
    });

    // Calculate average resolution time
    const resolvedTickets = tickets.filter(t => t.status === 'zatvoreno' && t.closed_at);
    if (resolvedTickets.length > 0) {
      const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at);
        const closed = new Date(ticket.closed_at);
        return sum + (closed.getTime() - created.getTime());
      }, 0);
      stats.averageResolutionTime = Math.round(totalResolutionTime / resolvedTickets.length / (1000 * 60 * 60 * 24)); // days
    }

    // Generate HTML report
    const reportDate = now.toLocaleDateString('hr-HR');
    const reportStartDate = weekStart.toLocaleDateString('hr-HR');

    const htmlReport = `
      <h1>Tjedni izvještaj - Zahtjevi za popravak</h1>
      <p><strong>Period:</strong> ${reportStartDate} - ${reportDate}</p>
      
      <h2>Općenita statistika</h2>
      <ul>
        <li><strong>Ukupno zahtjeva:</strong> ${stats.totalTickets}</li>
        <li><strong>Kreirano ovaj tjedan:</strong> ${stats.createdThisWeek}</li>
        <li><strong>Zatvoreno ovaj tjedan:</strong> ${stats.closedThisWeek}</li>
        <li><strong>Prosječno vrijeme rješavanja:</strong> ${stats.averageResolutionTime} dana</li>
      </ul>

      <h2>Zahtjevi po statusu</h2>
      <ul>
        ${Object.entries(stats.byStatus).map(([status, count]) => 
          `<li><strong>${status}:</strong> ${count}</li>`
        ).join('')}
      </ul>

      <h2>Zahtjevi po klubovima</h2>
      <ul>
        ${Object.entries(stats.byClub).map(([club, count]) => 
          `<li><strong>${club}:</strong> ${count}</li>`
        ).join('')}
      </ul>

      <h2>Zahtjevi po prioritetu</h2>
      <ul>
        ${Object.entries(stats.byPriority).map(([priority, count]) => 
          `<li><strong>${priority}:</strong> ${count}</li>`
        ).join('')}
      </ul>

      <h2>Zahtjevi po tehničarima</h2>
      <ul>
        ${Object.entries(stats.byTechnician).map(([tech, count]) => 
          `<li><strong>${tech}:</strong> ${count}</li>`
        ).join('')}
      </ul>

      <h2>Detaljni popis zahtjeva</h2>
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr style="background-color: #f2f2f2;">
          <th>Broj</th>
          <th>Naslov</th>
          <th>Klub</th>
          <th>Status</th>
          <th>Prioritet</th>
          <th>Djelatnik</th>
          <th>Tehničar</th>
          <th>Kreiran</th>
        </tr>
        ${tickets.map(ticket => `
          <tr>
            <td>${ticket.request_number || 'N/A'}</td>
            <td>${ticket.title}</td>
            <td>${clubMap[ticket.club_id]?.name || 'Nepoznat'}</td>
            <td>${ticket.status}</td>
            <td>${ticket.priority}</td>
            <td>${ticket.employee_name || 'N/A'}</td>
            <td>${userMap[ticket.assigned_technician_id]?.name || 'Nedodijeljen'}</td>
            <td>${new Date(ticket.created_at).toLocaleDateString('hr-HR')}</td>
          </tr>
        `).join('')}
      </table>
    `;

    // Send report to all admins via email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      const admins = users.filter(user => user.role === 'admin');
      
      const emailPromises = admins.map(async (admin) => {
        const emailData = {
          from: 'noreply@favbet.hr',
          to: [admin.email],
          subject: `Tjedni izvještaj - Zahtjevi za popravak (${reportDate})`,
          html: htmlReport
        };

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData)
        });

        if (!emailResponse.ok) {
          const error = await emailResponse.text();
          console.error(`Failed to send weekly report to ${admin.email}:`, error);
          return { success: false, email: admin.email, error };
        }

        return { success: true, email: admin.email };
      });

      const emailResults = await Promise.all(emailPromises);
      const successCount = emailResults.filter(result => result.success).length;

      return new Response(JSON.stringify({
        data: {
          message: `Tjedni izvještaj uspješno poslan: ${successCount}/${admins.length} adminima`,
          reportDate: reportDate,
          period: `${reportStartDate} - ${reportDate}`,
          statistics: stats,
          emailResults: emailResults
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      console.log('RESEND_API_KEY not configured, skipping email reports');
      
      return new Response(JSON.stringify({
        data: {
          message: 'Tjedni izvještaj generiran (email preskočen - RESEND_API_KEY nije konfiguriran)',
          reportDate: reportDate,
          period: `${reportStartDate} - ${reportDate}`,
          statistics: stats,
          htmlReport: htmlReport
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'WEEKLY_REPORT_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});