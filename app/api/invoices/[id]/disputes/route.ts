import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { logAuditEvent } from '@/lib/api/audit';
import { requirePrivyRoles, walletsMatch } from '@/lib/api/authz';

function getServiceRoleDebugInfo() {
  const candidateNames = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_ROLE',
    'SUPABASE_SECRET_KEY',
  ] as const;
  const present = candidateNames.find((name) => Boolean(process.env[name]));
  const raw = present ? String(process.env[present] ?? '') : '';
  const normalized = raw.trim().replace(/^['"]|['"]$/g, '').replace(/^Bearer\s+/i, '').trim();
  return {
    envNameUsed: present ?? null,
    hasValue: Boolean(raw),
    rawLength: raw.length,
    normalizedLength: normalized.length,
    hasBearerPrefix: /^Bearer\s+/i.test(raw),
    looksJwtLike: normalized.split('.').length === 3,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServiceRole();
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
  const debugMode = request.nextUrl.searchParams.get('debug') === '1';
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
      if (authenticatedWallet && raisedByWallet && !walletsMatch(raisedByWallet, authenticatedWallet)) {
        return NextResponse.json(
          { error: 'raisedByWallet must match the authenticated wallet' },
          { status: 403 }
        );
      }
      if (!authenticatedWallet && !raisedByWallet) {
        return NextResponse.json(
          { error: 'raisedByWallet is required when wallet claims are not present in token' },
          { status: 400 }
        );
      }
    }
    const effectiveRaisedByWallet = isStaff
      ? (raisedByWallet || null)
      : (authenticatedWallet || raisedByWallet || null);

    let supabase;
    try {
      supabase = getSupabaseServiceRole();
    } catch (clientError: any) {
      if (debugMode) {
        return NextResponse.json(
          {
            error: clientError?.message || 'Failed to initialize service role client',
            debug: {
              serviceRole: getServiceRoleDebugInfo(),
            },
          },
          { status: 500 }
        );
      }
      throw clientError;
    }
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, workflow_state')
      .eq('id', params.id)
      .single();
    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: invoiceError?.message || 'Invoice not found' },
        { status: invoiceError?.code === 'PGRST116' ? 404 : 500 }
      );
    }

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

    const fromStates = ['created', 'funded', 'approvals', 'released'];
    const toState = invoice.workflow_state === 'released' ? 'released' : invoice.workflow_state;
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ workflow_state: toState, status: 'disputed' })
      .eq('id', params.id)
      .in('workflow_state', fromStates);
    if (updateError) throw updateError;

    let auditWarning: string | null = null;
    try {
      await logAuditEvent({
        eventType: 'dispute.created',
        invoiceId: params.id,
        ticketId: ticket.id,
        disputeId: dispute.id,
        actor: isStaff ? 'admin' : 'user',
        actorWallet: effectiveRaisedByWallet,
        metadata: { reason },
      });
    } catch (auditError: any) {
      // Do not fail dispute creation if audit trail insert fails.
      auditWarning = auditError?.message || 'Audit logging failed';
      console.error('Dispute created but audit logging failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      dispute,
      ticket,
      ...(debugMode && auditWarning ? { debug: { auditWarning } } : {}),
    });
  } catch (error: any) {
    if (debugMode) {
      return NextResponse.json(
        {
          error: error?.message || 'Failed to create dispute',
          debug: {
            serviceRole: getServiceRoleDebugInfo(),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Failed to create dispute' }, { status: 500 });
  }
}
