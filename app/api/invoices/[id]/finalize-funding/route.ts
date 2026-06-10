import { NextRequest, NextResponse } from 'next/server';
import { requirePrivyRoles } from '@/lib/api/authz';
import { getInvoice } from '@/lib/api/invoices';
import { finalizeInvoiceFunding } from '@/lib/payments/finalize-funding';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authz = await requirePrivyRoles(request, ['user', 'admin', 'support']);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  try {
    const invoice = await getInvoice(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const result = await finalizeInvoiceFunding(params.id);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Finalize funding error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to finalize funding' },
      { status: 500 }
    );
  }
}
