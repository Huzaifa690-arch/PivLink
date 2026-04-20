import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { getEscrowPDA, getProgramId, uuidToBytes } from '@/lib/solana/utils';
import { transitionInvoiceWorkflowState } from '@/lib/api/invoices';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    const programId = getProgramId();
    const invoiceBytes = uuidToBytes(invoiceId);
    const [escrowPDA] = await getEscrowPDA(invoiceBytes, programId);

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: escrowPDA,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      } as any,
      { commitment: 'confirmed' }
    );

    const idl = await Program.fetchIdl(programId, provider);
    if (!idl) {
      throw new Error('Failed to fetch program IDL for approval status');
    }
    const program = new Program(idl as any, provider as any);

    let escrow: any = null;
    try {
      escrow = await (program.account as any).escrow.fetch(escrowPDA);
    } catch {
      return NextResponse.json({
        initialized: false,
        clientApproved: false,
        freelancerApproved: false,
        readyToRelease: false,
      });
    }

    const clientApproved = Boolean(escrow.clientApproved);
    const freelancerApproved = Boolean(escrow.freelancerApproved);
    const readyToRelease = clientApproved && freelancerApproved;

    if (readyToRelease) {
      // Explicit workflow transition funded -> approvals once both signatures exist.
      await transitionInvoiceWorkflowState(invoiceId, ['funded', 'approvals'], 'approvals');
    }

    return NextResponse.json({
      initialized: true,
      clientApproved,
      freelancerApproved,
      readyToRelease,
      escrowState: escrow.state,
      client: escrow.client?.toBase58?.() ?? null,
      freelancer: escrow.freelancer?.toBase58?.() ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch approval status' },
      { status: 500 }
    );
  }
}
