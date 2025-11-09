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

    // Extract all required fields from the new workflow
    const { 
      clubId, 
      machineId, 
      title, 
      description, 
      employeeName,  // Required: Employee name
      manufacturer,  // Required: Manufacturer (APEX, ATRONIC, EGT, etc.)
      gameName,      // Required: Game name
      canPlay,       // Required: 'da' or 'ne'
      assignedTechnicianId,  // Optional: Pre-assign technician
      attachments 
    } = await req.json();

    // Validate required fields according to workflow specification
    if (!clubId || !machineId || !title || !employeeName || !manufacturer || !gameName || !canPlay) {
      throw new Error('Obavezna polja: Klub, Automat, Naslov, Ime djelatnika, Proizvođač, Igre, Može li igrati');
    }

    // Validate canPlay value
    if (!['da', 'ne'].includes(canPlay)) {
      throw new Error('Polje "Može li igrati" mora biti "da" ili "ne"');
    }

    // Verify hall user can only create tickets for their club
    if (payload.role === 'hall' && payload.clubId !== clubId) {
      throw new Error('Nemate dozvolu za kreiranje zahtjeva za ovaj klub');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Get the auto-generated request number
    const requestNumberResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_request_number`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!requestNumberResponse.ok) {
      throw new Error('Neuspješno generiranje broja zahtjeva');
    }

    const requestNumber = await requestNumberResponse.text();

    // Create ticket with all new workflow fields
    const ticketResponse = await fetch(`${supabaseUrl}/rest/v1/tickets`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        club_id: clubId,
        machine_id: machineId,
        title,
        description: description || '',
        status: 'novo',  // Croatian status
        employee_name: employeeName,
        manufacturer,
        game_name: gameName,
        can_play: canPlay,
        request_number: requestNumber.replace(/"/g, ''), // Remove quotes from string response
        assigned_technician_id: assignedTechnicianId || null,
        created_by_user_id: payload.userId
      })
    });

    if (!ticketResponse.ok) {
      const error = await ticketResponse.text();
      throw new Error(`Neuspješno kreiranje zahtjeva: ${error}`);
    }

    const tickets = await ticketResponse.json();
    const ticket = tickets[0];

    // Create initial status history entry
    const historyResponse = await fetch(`${supabaseUrl}/rest/v1/request_status_history`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request_id: ticket.id,
        old_status: null,
        new_status: 'novo',
        comment: `Zahtjev kreiran: ${title}`,
        changed_by: payload.userId
      })
    });

    if (!historyResponse.ok) {
      console.error('Failed to create status history:', await historyResponse.text());
    }

    // Handle file attachments if provided
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const { fileData, fileName } = attachment;
        
        // Extract base64 data
        const base64Data = fileData.split(',')[1];
        const mimeType = fileData.split(';')[0].split(':')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Upload to storage
        const timestamp = Date.now();
        const storagePath = `${ticket.id}/${timestamp}-${fileName}`;

        const uploadResponse = await fetch(
          `${supabaseUrl}/storage/v1/object/ticket-attachments/${storagePath}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': mimeType,
            },
            body: binaryData
          }
        );

        if (!uploadResponse.ok) {
          console.error('Upload failed:', await uploadResponse.text());
          continue;
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/ticket-attachments/${storagePath}`;

        // Save attachment metadata
        await fetch(`${supabaseUrl}/rest/v1/ticket_attachments`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey!,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticket_id: ticket.id,
            file_url: publicUrl,
            filename: fileName
          })
        });
      }
    }

    // Send notification to admins
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'x-user-token': userToken
        },
        body: JSON.stringify({
          type: 'new_request',
          ticketId: ticket.id,
          requestNumber: ticket.request_number,
          title: ticket.title,
          clubId: clubId,
          employeeName: employeeName
        })
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the whole request if notification fails
    }

    return new Response(JSON.stringify({
      data: { 
        ticket,
        message: `Zahtjev uspješno kreiran! Broj: ${ticket.request_number}`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code: 'TICKET_CREATE_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});