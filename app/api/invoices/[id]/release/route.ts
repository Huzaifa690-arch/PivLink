import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { getInvoice, transitionInvoiceWorkflowState } from '@/lib/api/invoices';
import { getEscrowPDA, getVaultPDA, uuidToBytes, getProgramId } from '@/lib/solana/utils';
import { parseHotWalletKeypair } from '@/lib/solana/hot-wallet';
import bcrypt from 'bcryptjs';
import { deriveIdempotencyKey, getIdempotencyRecord, saveIdempotencyRecord } from '@/lib/api/idempotency';
import { reconcileInvoiceStateSafe } from '@/lib/api/reconciliation';
import { getSupabase } from '@/lib/supabase/client';
import { refreshInvoiceTransparencySignature } from '@/lib/api/transparency';
import { requireKycSubmitted } from '@/lib/api/kyc';

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

function parsePublicKeyOrThrow(value: string, label: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch (err: any) {
    const cleaned = (value ?? '').trim();
    const preview =
      cleaned.length > 12 ? `${cleaned.slice(0, 6)}...${cleaned.slice(-6)}` : cleaned;
    throw new Error(
      `Invalid ${label}: "${preview}" (len=${cleaned.length}). ${err?.message ?? String(err)}`
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;
  const ENDPOINT = 'invoices:release';
  const idempotencyKey = deriveIdempotencyKey(request, [ENDPOINT, invoiceId]);
  const existing = await getIdempotencyRecord(ENDPOINT, idempotencyKey);
  if (existing) {
    return NextResponse.json(existing.response_json, { status: existing.status_code });
  }

  try {
    const { password } = await request.json();

    // Verify password
    const invoice = await getInvoice(invoiceId);
    
    if (!invoice.release_password_hash) {
      const payload = { error: 'Release password not set for this invoice', idempotencyKey };
      await saveIdempotencyRecord({
        endpoint: ENDPOINT,
        idempotencyKey,
        invoiceId,
        statusCode: 400,
        responseJson: payload,
      });
      return NextResponse.json(payload, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, invoice.release_password_hash);
    if (!isValid) {
      const payload = { error: 'Invalid release password', idempotencyKey };
      await saveIdempotencyRecord({
        endpoint: ENDPOINT,
        idempotencyKey,
        invoiceId,
        statusCode: 401,
        responseJson: payload,
      });
      return NextResponse.json(payload, { status: 401 });
    }

    if (process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      const gate = await requireKycSubmitted(invoice.freelancer_wallet);
      if (!gate.ok) {
        const payload = { error: gate.error, idempotencyKey };
        await saveIdempotencyRecord({
          endpoint: ENDPOINT,
          idempotencyKey,
          invoiceId,
          statusCode: gate.status,
          responseJson: payload,
        });
        return NextResponse.json(payload, { status: gate.status });
      }
    }

    let currentWorkflowState = invoice.workflow_state ?? invoice.status;
    if (currentWorkflowState !== 'approvals') {
      try {
        const reconcile = await reconcileInvoiceStateSafe(invoiceId);
        currentWorkflowState = reconcile.nextState as any;
      } catch {
        // Ignore reconcile failure here; normal validation below will return actionable state.
      }
    }
    if (currentWorkflowState !== 'approvals') {
      const payload = { error: `Invoice is not ready for release. Current workflow state: ${currentWorkflowState}`, idempotencyKey };
      await saveIdempotencyRecord({
        endpoint: ENDPOINT,
        idempotencyKey,
        invoiceId,
        statusCode: 400,
        responseJson: payload,
      });
      return NextResponse.json(payload, { status: 400 });
    }

    // Get hot wallet (V1 only)
    const hotWalletPrivateKey = process.env.HOT_WALLET_PRIVATE_KEY;
    if (!hotWalletPrivateKey) {
      return NextResponse.json(
        { error: 'Hot wallet not configured' },
        { status: 500 }
      );
    }

    let hotWallet: Keypair;
    try {
      hotWallet = parseHotWalletKeypair(hotWalletPrivateKey);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Invalid HOT_WALLET_PRIVATE_KEY: ${err?.message ?? String(err)}` },
        { status: 500 }
      );
    }

    // Setup Solana connection
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    const programId = getProgramId();
    const usdcMintRaw = process.env.NEXT_PUBLIC_USDC_MINT ?? '';
    const treasuryWalletRaw = process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '';
    const usdcMint = parsePublicKeyOrThrow(usdcMintRaw, 'NEXT_PUBLIC_USDC_MINT');
    const treasuryWallet = parsePublicKeyOrThrow(
      treasuryWalletRaw,
      'NEXT_PUBLIC_TREASURY_WALLET'
    );
    const invoiceBytes = uuidToBytes(invoiceId);

    // Debug-only escape hatch:
    // when enabled, stop after password + base58 validation and do not touch on-chain release.
    const bypassApprovalChecks =
      process.env.BYPASS_RELEASE_APPROVALS_FOR_DEBUG === 'true';
    if (bypassApprovalChecks) {
      const payload = {
        success: true,
        debug: true,
        message:
          'Release debug mode enabled: password/base58 validation passed; on-chain release skipped.',
        validated: {
          invoiceId,
          freelancerWallet: invoice.freelancer_wallet,
          usdcMint: usdcMint.toBase58(),
          treasuryWallet: treasuryWallet.toBase58(),
          rpcUrl:
            process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        },
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

    // Derive PDAs
    const [escrowPDA] = await getEscrowPDA(invoiceBytes, programId);
    const [vaultPDA] = await getVaultPDA(invoiceBytes, programId);

    // Get token accounts
    const freelancerPubkey = parsePublicKeyOrThrow(
      invoice.freelancer_wallet,
      `invoice.freelancer_wallet for invoice ${invoiceId}`
    );
    const freelancerTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      freelancerPubkey
    );

    const treasuryTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      treasuryWallet
    );

    const preInstructions: any[] = [];
    const freelancerAtaInfo = await connection.getAccountInfo(freelancerTokenAccount);
    if (!freelancerAtaInfo) {
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          hotWallet.publicKey,
          freelancerTokenAccount,
          freelancerPubkey,
          usdcMint
        )
      );
    }

    const treasuryAtaInfo = await connection.getAccountInfo(treasuryTokenAccount);
    if (!treasuryAtaInfo) {
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          hotWallet.publicKey,
          treasuryTokenAccount,
          treasuryWallet,
          usdcMint
        )
      );
    }

    // Call the on-chain release instruction via Anchor
    const wallet = keypairWallet(hotWallet);
    const provider = new anchor.AnchorProvider(connection, wallet as any, {
      commitment: 'confirmed',
    });
    const idl = await anchor.Program.fetchIdl(programId, provider);
    if (!idl) {
      throw new Error('PivLinks program IDL not found on-chain. Run anchor idl init/upgrade.');
    }
    const program = new anchor.Program(idl, provider);

    const tx = await program.methods
      .release()
      .accounts({
        escrow: escrowPDA,
        vault: vaultPDA,
        freelancerToken: freelancerTokenAccount,
        treasuryToken: treasuryTokenAccount,
        usdcMint,
        freelancer: freelancerPubkey,
        authority: hotWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .rpc();

    const supabase = getSupabase();
    const { error: releaseTxSaveError } = await supabase
      .from('invoices')
      .update({ release_tx_signature: tx })
      .eq('id', invoiceId);
    if (releaseTxSaveError) {
      throw new Error(`Failed to save release transaction signature: ${releaseTxSaveError.message}`);
    }

    // Mark invoice as released only after on-chain success and only from approvals state.
    await transitionInvoiceWorkflowState(invoiceId, ['approvals', 'released'], 'released');
    const refreshedInvoice = await getInvoice(invoiceId);
    const transparencySignature = await refreshInvoiceTransparencySignature(refreshedInvoice);

    const payload = {
      success: true,
      message: 'Funds released successfully',
      transaction: tx,
      transaction_transparency_signature: transparencySignature,
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
    const errorMessage = error?.message || String(error) || 'Unknown error';
    const errorStack = error?.stack || '';
    console.error('Error releasing funds:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    const payload = { error: errorMessage, idempotencyKey };
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
