import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { getInvoice } from '@/lib/api/invoices';
import { getVaultPDA, uuidToBytes, getProgramId } from '@/lib/solana/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const invoice = await getInvoice(invoiceId);

    if (invoice.workflow_state !== 'created') {
      return NextResponse.json({ 
        status: invoice.workflow_state,
        message: 'Invoice already processed. Use reconcile endpoint for state updates.'
      });
    }

    // Derive vault & escrow PDAs
    const invoiceBytes = uuidToBytes(invoiceId);
    const programId = getProgramId();
    const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);

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

    const isFundedOnChain = BigInt(balance.value.amount) >= expectedAmount;
    return NextResponse.json({
      status: invoice.workflow_state,
      balance: balance.value.uiAmount,
      fundedOnChain: isFundedOnChain,
      message: isFundedOnChain
        ? 'Vault appears funded. Call POST /api/invoices/[id]/reconcile-funding to transition state.'
        : 'Invoice not yet funded.',
    });
  } catch (error: any) {
    console.error('Error checking funding status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check funding status' },
      { status: 500 }
    );
  }
}
