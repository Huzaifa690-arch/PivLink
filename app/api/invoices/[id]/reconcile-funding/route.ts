import { NextRequest, NextResponse } from 'next/server';
import { deriveIdempotencyKey, getIdempotencyRecord, saveIdempotencyRecord } from '@/lib/api/idempotency';
import { reconcileInvoiceStateSafe } from '@/lib/api/reconciliation';

const ENDPOINT = 'invoices:reconcile-funding';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;
  const idempotencyKey = deriveIdempotencyKey(request, [ENDPOINT, invoiceId]);

  const existing = await getIdempotencyRecord(ENDPOINT, idempotencyKey);
  if (existing) {
    return NextResponse.json(existing.response_json, { status: existing.status_code });
  }

  try {
    const result = await reconcileInvoiceStateSafe(invoiceId);
    const payload = {
      success: true,
      message: 'Funding reconciled.',
      idempotencyKey,
      result,
    };
    await saveIdempotencyRecord({
      endpoint: ENDPOINT,
      idempotencyKey,
      invoiceId,
      statusCode: 200,
      responseJson: payload,
    });
    return NextResponse.json(payload);
  } catch (error: any) {
    const payload = {
      error: error?.message || 'Failed to reconcile invoice funding',
      idempotencyKey,
    };
    await saveIdempotencyRecord({
      endpoint: ENDPOINT,
      idempotencyKey,
      invoiceId,
      statusCode: 500,
      responseJson: payload,
    });
    return NextResponse.json(payload, { status: 500 });
  }
}
