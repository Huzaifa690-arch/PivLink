import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { requirePrivyRoles, walletsMatch } from '@/lib/api/authz';

const BUCKET = 'kyc-documents';
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);

function safeExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return '';
  return filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function POST(request: NextRequest) {
  const authz = await requirePrivyRoles(request, ['user', 'support', 'admin']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  try {
    const body = await request.json();
    const { walletAddress, filename } = body ?? {};

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
    if (typeof filename !== 'string' || !filename.trim()) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    const ext = safeExtension(filename) || 'bin';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}` },
        { status: 400 }
      );
    }

    const path = `${targetWallet}/${crypto.randomUUID()}.${ext}`;
    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error) {
      return NextResponse.json(
        { error: `Failed to create upload URL: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bucket: BUCKET,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}
