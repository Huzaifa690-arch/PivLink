import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { requirePrivyRoles } from '@/lib/api/authz';

function isAdminAuthorized(request: NextRequest): boolean {
  const expected = process.env.ADMIN_PANEL_SECRET;
  if (!expected) return false;
  return request.headers.get('x-admin-secret') === expected;
}

export async function GET(request: NextRequest) {
  const authz = await requirePrivyRoles(request, ['admin', 'support']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = getSupabaseServiceRole();
    const [eventsRes, ticketsRes, disputesRes, kycRes, onrampInvoicesRes, onrampEventsRes] = await Promise.all([
      supabase
        .from('activity_audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200),
      supabase
        .from('invoice_disputes')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200),
      supabase
        .from('user_kyc')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(200),
      supabase
        .from('invoices')
        .select(
          'id, amount_usdc, status, workflow_state, payment_provider, onramp_session_id, onramp_status, onramp_destination_tx, onramp_error_message, reconcile_last_error, reconcile_attempt_count, funded_at, updated_at'
        )
        .not('onramp_session_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(100),
      supabase
        .from('stripe_onramp_events')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100),
    ]);

    if (eventsRes.error) throw eventsRes.error;
    if (ticketsRes.error) throw ticketsRes.error;
    if (disputesRes.error) throw disputesRes.error;
    if (kycRes.error) throw kycRes.error;
    if (onrampInvoicesRes.error) throw onrampInvoicesRes.error;
    if (onrampEventsRes.error) throw onrampEventsRes.error;

    return NextResponse.json({
      events: eventsRes.data ?? [],
      tickets: ticketsRes.data ?? [],
      disputes: disputesRes.data ?? [],
      kyc: kycRes.data ?? [],
      onrampInvoices: onrampInvoicesRes.data ?? [],
      onrampEvents: onrampEventsRes.data ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch admin activity' }, { status: 500 });
  }
}
