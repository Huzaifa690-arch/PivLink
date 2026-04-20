import { NextRequest, NextResponse } from 'next/server';
import { getInvoicesByFreelancer } from '@/lib/api/invoices';

/** GET /api/wallet/invoices?wallet=...&status=released - list invoices for freelancer wallet */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    const status = request.nextUrl.searchParams.get('status') as 'created' | 'funded' | 'approvals' | 'released' | 'disputed' | null;

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing wallet query parameter' },
        { status: 400 }
      );
    }

    const invoices = await getInvoicesByFreelancer(wallet, status ? { status } : undefined);
    return NextResponse.json({ invoices });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
