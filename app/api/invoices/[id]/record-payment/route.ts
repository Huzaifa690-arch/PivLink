import { NextRequest, NextResponse } from 'next/server';
import { getInvoice } from '@/lib/api/invoices';
import { getSupabase } from '@/lib/supabase/client';

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
  try {
    const invoiceId = params.id;
    const body = await request.json();
    const transaction_signature =
      typeof body.transaction_signature === 'string' ? body.transaction_signature :
      typeof body.signature === 'string' ? body.signature :
      typeof body.txSignature === 'string' ? body.txSignature :
      typeof body.txid === 'string' ? body.txid :
      undefined;

    if (!transaction_signature) {
      return NextResponse.json(
        { error: 'Missing or invalid transaction signature. Provide transaction_signature, signature, txSignature, or txid.' },
        { status: 400 }
      );
    }

    // Fetch invoice
    const invoice = await getInvoice(invoiceId);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if this transaction was already recorded
    if (invoice.payment_tx_signature && invoice.payment_tx_signature === transaction_signature) {
      return NextResponse.json({
        success: true,
        message: 'Payment already recorded',
        payment_tx_signature: transaction_signature,
      });
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
      return NextResponse.json(
        { error: `Failed to record payment: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment recorded',
      payment_tx_signature: transaction_signature,
    });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
