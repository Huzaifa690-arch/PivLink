import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { logAuditEvent } from '@/lib/api/audit';
import { requirePrivyRoles } from '@/lib/api/authz';

function isAdminAuthorized(request: NextRequest): boolean {
  const expected = process.env.ADMIN_PANEL_SECRET;
  if (!expected) return false;
  return request.headers.get('x-admin-secret') === expected;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authz = await requirePrivyRoles(request, ['support', 'admin']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;
    if (body.resolutionNotes !== undefined) updates.resolution_notes = body.resolutionNotes;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single();

    if (error) throw error;

    await logAuditEvent({
      eventType: 'ticket.updated',
      invoiceId: data.invoice_id,
      ticketId: data.id,
      actor: 'admin',
      metadata: updates,
    });

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update ticket' }, { status: 500 });
  }
}
