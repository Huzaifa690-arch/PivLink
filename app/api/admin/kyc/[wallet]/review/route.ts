import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { requirePrivyRoles } from '@/lib/api/authz';
import { logAuditEvent } from '@/lib/api/audit';

function isAdminAuthorized(request: NextRequest): boolean {
  const expected = process.env.ADMIN_PANEL_SECRET;
  if (!expected) return false;
  return request.headers.get('x-admin-secret') === expected;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  const authz = await requirePrivyRoles(request, ['admin', 'support']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wallet = params.wallet;
  if (!wallet) {
    return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { action, reason } = body ?? {};
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }
    if (action === 'reject' && (typeof reason !== 'string' || !reason.trim())) {
      return NextResponse.json(
        { error: 'reason is required when rejecting' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('user_kyc')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        rejection_reason: action === 'reject' ? reason.trim() : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: authz.userId,
      })
      .eq('wallet_address', wallet)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to update KYC: ${error.message}` },
        { status: 500 }
      );
    }

    try {
      await logAuditEvent({
        eventType: action === 'approve' ? 'kyc.approved' : 'kyc.rejected',
        actor: 'admin',
        actorWallet: authz.walletAddress ?? null,
        metadata: {
          target_wallet: wallet,
          ...(action === 'reject' ? { reason: reason.trim() } : {}),
        },
      });
    } catch (auditErr) {
      console.warn('Failed to log KYC review audit event:', auditErr);
    }

    return NextResponse.json({ success: true, kyc: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to review KYC' },
      { status: 500 }
    );
  }
}
