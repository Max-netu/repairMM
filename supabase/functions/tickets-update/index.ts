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
      throw new Error('Nedostaje korisnički token');
    }

    const payload = JSON.parse(atob(userToken));

    if (payload.exp < Date.now()) {
      throw new Error('Token je istekao');
    }

    const { ticketId, status, comment } = await req.json();

    if (!ticketId) {
      throw new Error('ID zahtjeva je obavezan');
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
      throw new Error('Zahtjev nije pronađen');
    }

    const ticket = tickets[0];

    // Check authorization based on new roles
    if (payload.role === 'technician' && ticket.assigned_technician_id !== payload.userId) {
      throw new Error('Nemate dozvolu za ažuriranje ovog zahtjeva');
    }
    if (payload.role === 'hall' && ticket.club_id !== payload.clubId) {
      throw new Error('Nemate dozvolu za ažuriranje ovog zahtjeva');
    }

    // Validate status changes according to workflow
    const validStatuses = ['novo', 'u_tijeku', 'čeka se rezervni dio', 'čeka se porezna', 'zatvoreno'];
    if (status && !validStatuses.includes(status)) {
      throw new Error(`Nevažeći status. Dozvoljeni statusi: ${validStatuses.join(', ')}`);
    }

    // If changing status, require comment with minimum 10 characters
    let isStatusChange = false;
    let oldStatus = ticket.status;
    
    if (status && status !== ticket.status) {
      isStatusChange = true;
      if (!comment || comment.length < 10) {
        throw new Error('Komentar je obavezan pri promjeni statusa (minimalno 10 znakova)');
      }
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updates.status = status;
      // Update closed_at when status becomes 'zatvoreno'
      if (status === 'zatvoreno') {
        updates.closed_at = new Date().toISOString();
      }
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
      throw new Error(`Neuspješno ažuriranje zahtjeva: ${error}`);
    }

    const updatedTickets = await updateResponse.json();
    const updatedTicket = updatedTickets[0];

    // Create status history entry if status changed
    if (isStatusChange) {
      const historyResponse = await fetch(`${supabaseUrl}/rest/v1/request_status_history`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: ticketId,
          old_status: oldStatus,
          new_status: status,
          comment: comment,
          changed_by: payload.userId
        })
      });

      if (!historyResponse.ok) {
        console.error('Failed to create status history:', await historyResponse.text());
      }

      // Send notification about status change
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
            type: 'status_change',
            ticketId: ticketId,
            requestNumber: ticket.request_number,
            title: ticket.title,
            oldStatus: oldStatus,
            newStatus: status,
            comment: comment
          })
        });
      } catch (notificationError) {
        console.error('Failed to send status change notification:', notificationError);
        // Don't fail the whole request if notification fails
      }
    }

    // Add comments if provided (not a status change)
    if (comment && !isStatusChange) {
      const currentComments = ticket.comments || '';
      const newComment = `\n\n[${new Date().toLocaleString('hr-HR')}] ${comment}`;
      const updatedComments = currentComments + newComment;

      await fetch(
        `${supabaseUrl}/rest/v1/tickets?id=eq.${ticketId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': serviceRoleKey!,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comments: updatedComments })
        }
      );
    }

    return new Response(JSON.stringify({
      data: { 
        ticket: updatedTicket,
        statusChanged: isStatusChange,
        message: isStatusChange ? `Status promijenjen u: ${status}` : 'Zahtjev uspješno ažuriran'
      }
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