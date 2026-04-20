import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { getInvoice, transitionInvoiceWorkflowState } from '@/lib/api/invoices';
import { logAuditEvent } from '@/lib/api/audit';
import { requirePrivyRoles, walletsMatch } from '@/lib/api/authz';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('invoice_disputes')
      .select('*')
      .eq('invoice_id', params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ disputes: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch disputes' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authz = await requirePrivyRoles(request, ['user', 'support', 'admin']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  try {
    const body = await request.json();
    const reason = body?.reason as string;
    const details = body?.details as string;
    const raisedByWallet = body?.raisedByWallet as string;
    const requesterEmail = body?.requesterEmail as string;
    if (!reason) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }
    const isStaff = authz.roles.includes('support') || authz.roles.includes('admin');
    const authenticatedWallet = authz.walletAddress;
    if (!isStaff) {
      if (!authenticatedWallet) {
        return NextResponse.json(
          { error: 'Authenticated Solana wallet not found in session token' },
          { status: 403 }
        );
      }
      if (raisedByWallet && !walletsMatch(raisedByWallet, authenticatedWallet)) {
        return NextResponse.json(
          { error: 'raisedByWallet must match the authenticated wallet' },
          { status: 403 }
        );
      }
    }
    const effectiveRaisedByWallet = isStaff ? (raisedByWallet || null) : authenticatedWallet;

    const invoice = await getInvoice(params.id);
    const supabase = getSupabase();

    // Create support ticket linked to this dispute
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        invoice_id: params.id,
        requester_wallet: effectiveRaisedByWallet,
        requester_email: requesterEmail || null,
        subject: `Dispute raised for invoice ${params.id}`,
        description: details || reason,
        category: 'dispute',
        status: 'open',
        priority: 'high',
      })
      .select('*')
      .single();
    if (ticketError) throw ticketError;

    const { data: dispute, error: disputeError } = await supabase
      .from('invoice_disputes')
      .insert({
        invoice_id: params.id,
        ticket_id: ticket.id,
        raised_by_wallet: effectiveRaisedByWallet,
        reason,
        details: details || null,
        status: 'open',
      })
      .select('*')
      .single();
    if (disputeError) throw disputeError;

    await transitionInvoiceWorkflowState(
      params.id,
      ['created', 'funded', 'approvals', 'released'],
      (invoice.workflow_state === 'released' ? 'released' : invoice.workflow_state) as any,
      { status: 'disputed' as any }
    );

    await logAuditEvent({
      eventType: 'dispute.created',
      invoiceId: params.id,
      ticketId: ticket.id,
      disputeId: dispute.id,
      actor: isStaff ? 'admin' : 'user',
      actorWallet: effectiveRaisedByWallet,
      metadata: { reason },
    });

    return NextResponse.json({ success: true, dispute, ticket });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create dispute' }, { status: 500 });
  }
}
