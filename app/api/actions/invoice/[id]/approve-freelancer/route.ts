import { NextRequest } from 'next/server';
import {
  createPostResponse,
  createActionHeaders,
  type ActionGetResponse,
  type ActionError,
} from '@solana/actions';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getEscrowPDA, getProgramId, uuidToBytes } from '@/lib/solana/utils';

const headers = createActionHeaders();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;
  const origin = req.nextUrl.origin;
  const actionHref = `${origin}/api/actions/invoice/${invoiceId}/approve-freelancer`;

  const payload: ActionGetResponse = {
    type: 'action',
    title: 'PivLink - Freelancer approval',
    icon: new URL('/favicon.ico', origin).toString(),
    description: 'Approve escrow release as the freelancer.',
    label: 'Approve as freelancer',
    links: {
      actions: [{ type: 'transaction', label: 'Approve as freelancer', href: actionHref }],
    },
  };

  return Response.json(payload, { headers });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const body = await req.json();
    const accountStr = body?.account;
    if (!accountStr || typeof accountStr !== 'string') {
      const actionError: ActionError = { message: 'Missing or invalid "account" public key' };
      return Response.json(actionError, { status: 400, headers });
    }

    const signer = new PublicKey(accountStr);
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
        publicKey: signer,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      } as any,
      { commitment: 'confirmed' }
    );

    const idl = await Program.fetchIdl(programId, provider);
    if (!idl) throw new Error('Failed to fetch program IDL');
    const program = new Program(idl as any, provider as any);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: signer,
      blockhash,
      lastValidBlockHeight,
    });

    const approveIx = await program.methods
      .approveFreelancer()
      .accounts({
        escrow: escrowPDA,
        freelancer: signer,
      })
      .instruction();

    tx.add(approveIx);

    const payload = await createPostResponse({
      fields: {
        type: 'transaction',
        transaction: tx,
        message: `Freelancer approval submitted for invoice ${invoiceId.slice(0, 8)}...`,
      },
    });

    return Response.json(payload, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to build approval transaction';
    const actionError: ActionError = { message };
    return Response.json(actionError, { status: 400, headers });
  }
}
