import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { getInvoice } from '@/lib/api/invoices';
import { initializeEscrow, isEscrowInitialized } from '@/lib/api/contract';
import { getSupabase } from '@/lib/supabase/client';

/**
 * POST /api/invoices/[id]/prepare
 * 
 * Prepares an invoice for payment by:
 * 1. Checking if escrow is already initialized on-chain
 * 2. If not, initializing it with the hot wallet
 * 3. Marking the invoice as "escrow_initialized" in the database
 * 
 * Must be called BEFORE the user attempts to pay.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;

    // Fetch invoice from database
    const invoice = await getInvoice(invoiceId);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check status: must be in 'created' state
    if (invoice.status !== 'created') {
      return NextResponse.json({
        success: true,
        message: `Invoice is already in '${invoice.status}' status.`,
        escrow_initialized: invoice.escrow_initialized ?? false,
      });
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Check if already initialized on-chain
    const alreadyInitialized = await isEscrowInitialized(invoiceId, connection);
    if (alreadyInitialized) {
      // Mark in DB if we're just now discovering it
      if (!invoice.escrow_initialized) {
        const supabase = getSupabase();
        await supabase
          .from('invoices')
          .update({
            escrow_initialized: true,
            escrow_initialized_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);
      }

      return NextResponse.json({
        success: true,
        message: 'Escrow already initialized on-chain. Ready for payment.',
        escrow_initialized: true,
      });
    }

    // Get hot wallet
    const hotWalletPrivateKey = process.env.HOT_WALLET_PRIVATE_KEY;
    if (!hotWalletPrivateKey) {
      return NextResponse.json(
        { error: 'Hot wallet not configured on server' },
        { status: 500 }
      );
    }

    const hotWallet = Keypair.fromSecretKey(bs58.decode(hotWalletPrivateKey));

    // Initialize escrow on-chain
    try {
      const signature = await initializeEscrow({
        invoiceId,
        amount: Number(invoice.amount_usdc),
        freelancerWallet: new PublicKey(invoice.freelancer_wallet),
        clientWallet: hotWallet.publicKey,
        connection,
        hotWallet,
      });

      // Mark as initialized in database
      const supabase = getSupabase();
      const { error: dbError } = await supabase
        .from('invoices')
        .update({
          escrow_initialized: true,
          escrow_initialized_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (dbError) {
        console.error('Failed to update invoice in DB:', dbError);
      }

      return NextResponse.json({
        success: true,
        message: 'Escrow initialized successfully. Ready for payment.',
        signature,
        escrow_initialized: true,
      });
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: `Failed to initialize escrow: ${msg}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error preparing invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to prepare invoice' },
      { status: 500 }
    );
  }
}
