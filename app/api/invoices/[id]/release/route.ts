import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { getInvoice, updateInvoiceStatus } from '@/lib/api/invoices';
import { getEscrowPDA, getVaultPDA, uuidToBytes, getProgramId, getUsdcMint, getTreasuryWallet } from '@/lib/solana/utils';
import { parseHotWalletKeypair } from '@/lib/solana/hot-wallet';
import bcrypt from 'bcryptjs';

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
  try {
    const invoiceId = params.id;
    const { password } = await request.json();

    // Verify password
    const invoice = await getInvoice(invoiceId);
    
    if (!invoice.release_password_hash) {
      return NextResponse.json(
        { error: 'Release password not set for this invoice' },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, invoice.release_password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid release password' },
        { status: 401 }
      );
    }

    if (invoice.status !== 'funded') {
      return NextResponse.json(
        { error: `Invoice is not funded. Current status: ${invoice.status}` },
        { status: 400 }
      );
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
      throw new Error('PivLink program IDL not found on-chain. Run anchor idl init/upgrade.');
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

    // Mark invoice as released only after on-chain success
    await updateInvoiceStatus(invoiceId, 'released');

    return NextResponse.json({ 
      success: true,
      message: 'Funds released successfully',
      transaction: tx,
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || 'Unknown error';
    const errorStack = error?.stack || '';
    console.error('Error releasing funds:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
