import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import bs58 from 'bs58';
import { getInvoice, updateInvoiceStatus } from '@/lib/api/invoices';
import { getEscrowPDA, getVaultPDA, uuidToBytes, getProgramId } from '@/lib/solana/utils';

function keypairWallet(kp: Keypair) {
  return {
    publicKey: kp.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(kp);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach((t) => t.partialSign(kp));
      return txs;
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const invoice = await getInvoice(invoiceId);

    if (invoice.status !== 'created') {
      return NextResponse.json({ 
        status: invoice.status,
        message: 'Invoice already processed'
      });
    }

    // Derive vault & escrow PDAs
    const invoiceBytes = uuidToBytes(invoiceId);
    const programId = getProgramId();
    const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);
    const [escrowPDA] = await getEscrowPDA(invoiceBytes, programId);

    // Check vault balance
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    const vaultAccount = await connection.getAccountInfo(vaultPDA);
    if (!vaultAccount) {
      return NextResponse.json({
        status: 'created',
        balance: 0,
        message: 'Invoice not yet funded. Escrow vault has not been created yet.',
      });
    }

    // Get token account balance using Connection method
    const balance = await connection.getTokenAccountBalance(vaultPDA);

    // Convert amount to lamports (USDC has 6 decimals)
    const expectedAmount = BigInt(Math.floor(invoice.amount_usdc * 1_000_000));

    if (BigInt(balance.value.amount) >= expectedAmount) {
      // If the vault holds enough USDC, consider the invoice funded and update the database.
      // The payment transaction already includes deposit_notification, so this route should not fail
      // simply because the server has no hot wallet for an additional notification call.
      await updateInvoiceStatus(invoiceId, 'funded');

      return NextResponse.json({
        status: 'funded',
        balance: balance.value.uiAmount,
        message: 'Invoice is now funded.',
      });
    }

    return NextResponse.json({
      status: 'created',
      balance: balance.value.uiAmount,
      message: 'Invoice not yet funded',
    });
  } catch (error: any) {
    console.error('Error checking funding status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check funding status' },
      { status: 500 }
    );
  }
}
