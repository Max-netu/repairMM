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
      throw new Error('Nedostaje korisnički token');
    }

    const payload = JSON.parse(atob(userToken));

    if (payload.exp < Date.now()) {
      throw new Error('Token je istekao');
    }

    const { type, ticketId, requestNumber, title, clubId, employeeName } = await req.json();

    if (!type) {
      throw new Error('Tip notifikacije je obavezan');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (type === 'new_request') {
      // Get club information
      const clubResponse = await fetch(`${supabaseUrl}/rest/v1/clubs?id=eq.${clubId}`, {
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
        }
      });

      if (!clubResponse.ok) {
        throw new Error('Neuspješno dohvaćanje informacija o klubu');
      }

      const clubs = await clubResponse.json();
      const club = clubs[0];

      // Get all admin users
      const adminsResponse = await fetch(`${supabaseUrl}/rest/v1/users?role=eq.admin`, {
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
        }
      });

      if (!adminsResponse.ok) {
        throw new Error('Neuspješno dohvaćanje admin korisnika');
      }

      const admins = await adminsResponse.json();

      // Send email notifications to all admins using Resend API
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      
      if (resendApiKey) {
        const emailPromises = admins.map(async (admin) => {
          const emailData = {
            from: 'noreply@favbet.hr',
            to: [admin.email],
            subject: `Novi zahtjev za popravak - ${requestNumber}`,
            html: `
              <h2>Novi zahtjev za popravak</h2>
              <p><strong>Broj zahtjeva:</strong> ${requestNumber}</p>
              <p><strong>Naslov:</strong> ${title}</p>
              <p><strong>Klub:</strong> ${club.name} (${club.city})</p>
              <p><strong>Djelatnik:</strong> ${employeeName}</p>
              <p><strong>Vrijeme:</strong> ${new Date().toLocaleString('hr-HR')}</p>
              <br>
              <p><a href="https://fidp9y88090r.space.minimax.io/admin/tickets/${ticketId}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pregledaj zahtjev</a></p>
            `
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
            console.error(`Failed to send email to ${admin.email}:`, error);
            return { success: false, email: admin.email, error };
          }

          return { success: true, email: admin.email };
        });

        const emailResults = await Promise.all(emailPromises);
        const successCount = emailResults.filter(result => result.success).length;

        console.log(`Email notifications sent: ${successCount}/${admins.length}`);

        return new Response(JSON.stringify({
          data: {
            message: `Email notifikacije poslane: ${successCount}/${admins.length}`,
            results: emailResults
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else {
        console.log('RESEND_API_KEY not configured, skipping email notifications');
        
        return new Response(JSON.stringify({
          data: {
            message: 'Email notifikacije preskočene (RESEND_API_KEY nije konfiguriran)',
            adminCount: admins.length
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } else if (type === 'status_change') {
      // Handle status change notifications
      const { oldStatus, newStatus, comment } = await req.json();

      // Get all relevant users (admins, assigned technician, club user)
      const usersResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?or=(role.eq.admin,id.eq.${payload.userId})`
      , {
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
        }
      });

      if (!usersResponse.ok) {
        throw new Error('Neuspješno dohvaćanje korisnika za notifikaciju');
      }

      const users = await usersResponse.json();

      // Send status change notifications
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      
      if (resendApiKey) {
        const emailPromises = users.map(async (user) => {
          const emailData = {
            from: 'noreply@favbet.hr',
            to: [user.email],
            subject: `Status zahtjeva promijenjen - ${requestNumber}`,
            html: `
              <h2>Status zahtjeva promijenjen</h2>
              <p><strong>Broj zahtjeva:</strong> ${requestNumber}</p>
              <p><strong>Naslov:</strong> ${title}</p>
              <p><strong>Stari status:</strong> ${oldStatus}</p>
              <p><strong>Novi status:</strong> ${newStatus}</p>
              <p><strong>Komentar:</strong> ${comment}</p>
              <p><strong>Vrijeme:</strong> ${new Date().toLocaleString('hr-HR')}</p>
            `
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
            console.error(`Failed to send status email to ${user.email}:`, error);
            return { success: false, email: user.email, error };
          }

          return { success: true, email: user.email };
        });

        await Promise.all(emailPromises);
      }

    } else {
      throw new Error(`Nepoznat tip notifikacije: ${type}`);
    }

    return new Response(JSON.stringify({
      data: { message: 'Notifikacija uspješno poslana' }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'NOTIFICATION_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});