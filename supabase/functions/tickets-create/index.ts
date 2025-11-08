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

    const { clubId, machineId, title, description, priority, attachments } = await req.json();

    if (!clubId || !machineId || !title) {
      throw new Error('Club ID, Machine ID, and title are required');
    }

    // Verify club user can only create tickets for their club
    if (payload.role === 'club' && payload.clubId !== clubId) {
      throw new Error('Not authorized to create tickets for this club');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Create ticket
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
        status: 'new',
        priority: priority || 'normal',
        created_by_user_id: payload.userId
      })
    });

    if (!ticketResponse.ok) {
      const error = await ticketResponse.text();
      throw new Error(`Failed to create ticket: ${error}`);
    }

    const tickets = await ticketResponse.json();
    const ticket = tickets[0];

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

    return new Response(JSON.stringify({
      data: { ticket }
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
