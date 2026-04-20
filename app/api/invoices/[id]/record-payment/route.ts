import { NextRequest, NextResponse } from 'next/server';
import { getInvoice, transitionInvoiceWorkflowState } from '@/lib/api/invoices';
import { getSupabase } from '@/lib/supabase/client';
import { deriveIdempotencyKey, getIdempotencyRecord, saveIdempotencyRecord } from '@/lib/api/idempotency';

/**
 * POST /api/invoices/[id]/record-payment
 * 
 * Records the payment transaction signature in the database after user confirms payment.
 * This prevents duplicate payments and ghosted transactions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;
  const ENDPOINT = 'invoices:record-payment';
  const fallbackSig = request.nextUrl.searchParams.get('sig') || '';
  const idempotencyKey = deriveIdempotencyKey(request, [ENDPOINT, invoiceId, fallbackSig]);
  const existing = await getIdempotencyRecord(ENDPOINT, idempotencyKey);
  if (existing) {
    return NextResponse.json(existing.response_json, { status: existing.status_code });
  }

  try {
    const body = await request.json();
    const transaction_signature =
      typeof body.transaction_signature === 'string' ? body.transaction_signature :
      typeof body.signature === 'string' ? body.signature :
      typeof body.txSignature === 'string' ? body.txSignature :
      typeof body.txid === 'string' ? body.txid :
      undefined;

    if (!transaction_signature) {
      const payload = { error: 'Missing or invalid transaction signature. Provide transaction_signature, signature, txSignature, or txid.' };
      await saveIdempotencyRecord({
        endpoint: ENDPOINT,
        idempotencyKey,
        invoiceId,
        statusCode: 400,
        responseJson: payload,
      });
      return NextResponse.json(payload, { status: 400 });
    }

    // Fetch invoice
    const invoice = await getInvoice(invoiceId);
    if (!invoice) {
      const payload = { error: 'Invoice not found' };
      await saveIdempotencyRecord({
        endpoint: ENDPOINT,
        idempotencyKey,
        invoiceId,
        statusCode: 404,
        responseJson: payload,
      });
      return NextResponse.json(payload, { status: 404 });
    }

    // Check if this transaction was already recorded
    if (invoice.payment_tx_signature && invoice.payment_tx_signature === transaction_signature) {
      const payload = {
        success: true,
        message: 'Payment already recorded',
        payment_tx_signature: transaction_signature,
        idempotencyKey,
      };
      await saveIdempotencyRecord({
        endpoint: ENDPOINT,
        idempotencyKey,
        invoiceId,
        statusCode: 200,
        responseJson: payload,
      });
      return NextResponse.json(payload);
    }

    // Record the payment transaction
    const supabase = getSupabase();
    const { error: dbError } = await supabase
      .from('invoices')
      .update({
        payment_tx_signature: transaction_signature,
        payment_tx_timestamp: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (dbError) {
      const payload = { error: `Failed to record payment: ${dbError.message}`, idempotencyKey };
      await saveIdempotencyRecord({
        endpoint: ENDPOINT,
        idempotencyKey,
        invoiceId,
        statusCode: 500,
        responseJson: payload,
      });
      return NextResponse.json(payload, { status: 500 });
    }

    // Keep explicit state machine monotonic; do not regress from funded/approvals/released.
    await transitionInvoiceWorkflowState(invoiceId, ['created', 'funded'], 'funded');

    const payload = {
      success: true,
      message: 'Payment recorded',
      payment_tx_signature: transaction_signature,
      idempotencyKey,
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
    console.error('Error recording payment:', error);
    const payload = { error: error.message || 'Failed to record payment', idempotencyKey };
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
