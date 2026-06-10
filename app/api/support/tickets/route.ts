import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getSupabaseServiceRole } from '@/lib/supabase/client';
import { logAuditEvent } from '@/lib/api/audit';
import { requirePrivyRoles, walletsMatch } from '@/lib/api/authz';

export async function GET(request: NextRequest) {
  try {
    const invoiceId = request.nextUrl.searchParams.get('invoiceId');
    const wallet = request.nextUrl.searchParams.get('wallet');
    const status = request.nextUrl.searchParams.get('status');
    const supabase = getSupabase();
    let query = supabase.from('support_tickets').select('*').order('updated_at', { ascending: false }).limit(100);

    if (invoiceId) query = query.eq('invoice_id', invoiceId);
    if (wallet) query = query.eq('requester_wallet', wallet);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ tickets: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authz = await requirePrivyRoles(request, ['user', 'support', 'admin']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  try {
    const body = await request.json();
    const {
      invoiceId,
      requesterWallet,
      requesterEmail,
      subject,
      description,
      category,
      priority,
    } = body ?? {};

    if (!subject || !description || !category) {
      return NextResponse.json({ error: 'subject, description, and category are required' }, { status: 400 });
    }
    const isStaff = authz.roles.includes('support') || authz.roles.includes('admin');
    const authenticatedWallet = authz.walletAddress;
    if (!isStaff) {
      if (authenticatedWallet && requesterWallet && !walletsMatch(requesterWallet, authenticatedWallet)) {
        return NextResponse.json(
          { error: 'requesterWallet must match the authenticated wallet' },
          { status: 403 }
        );
      }
      if (!authenticatedWallet && !requesterWallet) {
        return NextResponse.json(
          { error: 'requesterWallet is required when wallet claims are not present in token' },
          { status: 400 }
        );
      }
    }
    const effectiveRequesterWallet = isStaff
      ? (requesterWallet || null)
      : (authenticatedWallet || requesterWallet || null);

    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        invoice_id: invoiceId || null,
        requester_wallet: effectiveRequesterWallet,
        requester_email: requesterEmail || null,
        subject,
        description,
        category,
        priority: priority || 'normal',
        status: 'open',
      })
      .select('*')
      .single();

    if (error) throw error;

    await logAuditEvent({
      eventType: 'ticket.created',
      invoiceId: invoiceId || null,
      ticketId: data.id,
      actor: isStaff ? 'admin' : 'user',
      actorWallet: effectiveRequesterWallet,
      metadata: { category, priority: priority || 'normal' },
    });

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create ticket' }, { status: 500 });
  }
}
