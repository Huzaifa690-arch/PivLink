import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getInvoice } from '@/lib/api/invoices';
import { initializeEscrow, isEscrowInitialized } from '@/lib/api/contract';
import { parseHotWalletKeypair } from '@/lib/solana/hot-wallet';

/**
 * Initialize the escrow for an invoice (backend-driven)
 * This creates the on-chain escrow state and vault token account
 * Called before payment to ensure the vault exists
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

    // Check if already initialized
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    const isInitialized = await isEscrowInitialized(invoiceId, connection);
    if (isInitialized) {
      return NextResponse.json({
        success: true,
        message: 'Escrow already initialized',
        initialized: true,
      });
    }

    // Get hot wallet (backend signing authority)
    const hotWalletPrivateKey = process.env.HOT_WALLET_PRIVATE_KEY;
    if (!hotWalletPrivateKey) {
      return NextResponse.json(
        { error: 'Hot wallet not configured on server' },
        { status: 500 }
      );
    }

    const hotWallet = parseHotWalletKeypair(hotWalletPrivateKey);

    // For devnet testing: use hot wallet as client if not specified
    // In production, you'd want a proper client wallet
    let clientWallet: PublicKey;
    if (invoice.client_name) {
      // If client name exists but no wallet specified, use a placeholder
      // In production, you'd need to derive or store client wallets
      clientWallet = hotWallet.publicKey;
    } else {
      clientWallet = hotWallet.publicKey;
    }

    // Initialize escrow on-chain
    const signature = await initializeEscrow({
      invoiceId,
      amount: Number(invoice.amount_usdc),
      freelancerWallet: new PublicKey(invoice.freelancer_wallet),
      clientWallet,
      connection,
      hotWallet,
    });

    return NextResponse.json({
      success: true,
      message: 'Escrow initialized successfully',
      signature,
      initialized: true,
    });
  } catch (error: any) {
    console.error('Error initializing escrow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize escrow' },
      { status: 500 }
    );
  }
}
