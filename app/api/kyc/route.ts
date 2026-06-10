import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { requirePrivyRoles, walletsMatch } from '@/lib/api/authz';
import { ensureUser } from '@/lib/api/invoices';
import { getUserKyc } from '@/lib/api/kyc';
import { logAuditEvent } from '@/lib/api/audit';
import type { KycIdType } from '@/lib/supabase/types';

const ALLOWED_ID_TYPES: KycIdType[] = ['passport', 'drivers_license', 'national_id'];

function calcAgeYears(isoDate: string, now = new Date()): number {
  const dob = new Date(isoDate);
  if (Number.isNaN(dob.getTime())) return -1;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export async function GET(request: NextRequest) {
  const authz = await requirePrivyRoles(request, ['user', 'support', 'admin']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  const wallet = authz.walletAddress;
  if (!wallet) {
    return NextResponse.json({ kyc: null, walletAddress: null }, { status: 200 });
  }
  try {
    const kyc = await getUserKyc(wallet);
    return NextResponse.json({ kyc, walletAddress: wallet });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load KYC' },
      { status: 500 }
    );
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
      walletAddress,
      fullName,
      dateOfBirth,
      country,
      idType,
      idNumber,
      idDocumentPath,
    } = body ?? {};

    const authenticatedWallet = authz.walletAddress;
    const targetWallet = (walletAddress || authenticatedWallet || '').trim();

    if (!targetWallet) {
      return NextResponse.json(
        { error: 'walletAddress is required when wallet claims are not present in the token' },
        { status: 400 }
      );
    }
    if (
      authenticatedWallet &&
      walletAddress &&
      !walletsMatch(walletAddress, authenticatedWallet)
    ) {
      return NextResponse.json(
        { error: 'walletAddress must match the authenticated wallet' },
        { status: 403 }
      );
    }

    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json({ error: 'fullName is required (min 2 chars)' }, { status: 400 });
    }
    if (typeof dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return NextResponse.json(
        { error: 'dateOfBirth is required in YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    const age = calcAgeYears(dateOfBirth);
    if (age < 18) {
      return NextResponse.json(
        { error: 'You must be at least 18 years old to use PivLinks' },
        { status: 400 }
      );
    }
    if (typeof country !== 'string' || country.trim().length !== 2) {
      return NextResponse.json(
        { error: 'country is required as ISO-3166 alpha-2 (2 letters)' },
        { status: 400 }
      );
    }
    if (!ALLOWED_ID_TYPES.includes(idType)) {
      return NextResponse.json(
        { error: `idType must be one of: ${ALLOWED_ID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (typeof idNumber !== 'string' || idNumber.trim().length < 3) {
      return NextResponse.json({ error: 'idNumber is required (min 3 chars)' }, { status: 400 });
    }

    await ensureUser(targetWallet, fullName.trim());

    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('user_kyc')
      .upsert(
        {
          wallet_address: targetWallet,
          full_name: fullName.trim(),
          date_of_birth: dateOfBirth,
          country: country.trim().toUpperCase(),
          id_type: idType,
          id_number: idNumber.trim(),
          id_document_path: typeof idDocumentPath === 'string' && idDocumentPath ? idDocumentPath : null,
          status: 'pending',
          rejection_reason: null,
          submitted_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null,
        },
        { onConflict: 'wallet_address' }
      )
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to save KYC: ${error.message}` },
        { status: 500 }
      );
    }

    try {
      await logAuditEvent({
        eventType: 'kyc.submitted',
        actor: 'user',
        actorWallet: targetWallet,
        metadata: { country: country.trim().toUpperCase(), id_type: idType },
      });
    } catch (auditErr) {
      console.warn('Failed to log KYC audit event:', auditErr);
    }

    return NextResponse.json({ success: true, kyc: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to submit KYC' },
      { status: 500 }
    );
  }
}
