'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import bs58 from 'bs58';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { getInvoice } from '@/lib/api/invoices';
import type { Invoice } from '@/lib/supabase/types';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/components/Toast';

function pickPreferredSolanaWallet(wallets: any[] = []) {
  if (!wallets.length) return null;
  const embedded = wallets.find((w: any) => {
    const wt = String(w?.walletClientType ?? '').toLowerCase();
    return wt === 'privy' || wt === 'privy-v2' || wt.includes('embedded');
  });
  return embedded ?? wallets[0];
}

function getSolanaChainForClientTx(): 'solana:mainnet' | 'solana:devnet' {
  const rpc = (process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '').toLowerCase();
  if (rpc.includes('mainnet')) return 'solana:mainnet';
  if (rpc.includes('devnet')) return 'solana:devnet';
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' ? 'solana:mainnet' : 'solana:devnet';
}

function getChainForWallet(wallet: any): 'solana:mainnet' | 'solana:devnet' {
  const chainId = String(wallet?.chainId ?? '').toLowerCase();
  if (chainId === 'solana:mainnet' || chainId === 'solana:devnet') {
    return chainId;
  }
  return getSolanaChainForClientTx();
}

export default function ReleaseFundsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const { authenticated, ready } = usePrivy();
  const { wallets: mainWallets } = useWallets();
  const { wallets: solanaWallets, ready: solanaWalletsReady } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(true);
  const [clientApproved, setClientApproved] = useState(false);
  const [freelancerApproved, setFreelancerApproved] = useState(false);
  const [expectedClientWallet, setExpectedClientWallet] = useState<string | null>(null);
  const [expectedFreelancerWallet, setExpectedFreelancerWallet] = useState<string | null>(null);
  const [approvingRole, setApprovingRole] = useState<'client' | 'freelancer' | null>(null);
  const [reconnectingWallet, setReconnectingWallet] = useState(false);
  const [fundingWallet, setFundingWallet] = useState<any>(null);
  const { toast } = useToast();
  const connectedWalletAddress = fundingWallet?.address ?? solanaWallets?.[0]?.address ?? null;
  const normalizedConnected = connectedWalletAddress?.toLowerCase() ?? null;
  const isClientWallet =
    normalizedConnected !== null &&
    expectedClientWallet !== null &&
    normalizedConnected === expectedClientWallet.toLowerCase();
  const isFreelancerWallet =
    normalizedConnected !== null &&
    expectedFreelancerWallet !== null &&
    normalizedConnected === expectedFreelancerWallet.toLowerCase();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login');
      return;
    }
    loadInvoice();
    loadApprovalStatus();
  }, [invoiceId, ready, authenticated, router]);

  useEffect(() => {
    if (solanaWalletsReady && solanaWallets?.length > 0) {
      setFundingWallet(pickPreferredSolanaWallet(solanaWallets));
      return;
    }
    const solanaFromMain = mainWallets.find((w: { type?: string; chainId?: string; walletClientType?: string }) => {
      if ((w as { type?: string }).type === 'solana') return true;
      const wt = w.walletClientType ?? '';
      if (wt !== 'privy' && wt !== 'privy-v2') return false;
      return (w.chainId ?? '').toLowerCase().startsWith('solana:');
    });
    if (solanaFromMain) setFundingWallet(solanaFromMain);
  }, [solanaWalletsReady, solanaWallets, mainWallets]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoice(invoiceId);
      setInvoice(data);
    } catch {
      toast('Failed to load invoice.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadApprovalStatus = async () => {
    setApprovalLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/approval-status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load approval status');
      setClientApproved(Boolean(data.clientApproved));
      setFreelancerApproved(Boolean(data.freelancerApproved));
      setExpectedClientWallet(typeof data.client === 'string' ? data.client : null);
      setExpectedFreelancerWallet(typeof data.freelancer === 'string' ? data.freelancer : null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load approval status');
    } finally {
      setApprovalLoading(false);
    }
  };

  const submitApproval = async (role: 'client' | 'freelancer') => {
    const preferredAddress = fundingWallet?.address;
    const wallet =
      (preferredAddress
        ? solanaWallets?.find((w: any) => w?.address === preferredAddress)
        : null) ??
      pickPreferredSolanaWallet(solanaWallets) ??
      fundingWallet;
    const walletAddress = wallet?.address;
    if (!wallet || !walletAddress) {
      toast('Connect your Solana wallet first.', 'warning');
      return;
    }
    if (role === 'client' && !isClientWallet) {
      setError('This connected wallet is not the client wallet for this escrow. Switch to the client wallet to approve.');
      return;
    }
    if (role === 'freelancer' && !isFreelancerWallet) {
      setError('This connected wallet is not the freelancer wallet for this escrow. Switch to the freelancer wallet to approve.');
      return;
    }

    setApprovingRole(role);
    setError('');
    try {
      if (typeof wallet.connect === 'function') {
        try {
          await wallet.connect();
        } catch (connectErr: any) {
          throw new Error(connectErr?.message || 'Wallet connection failed. Please reconnect your wallet.');
        }
      }
      if (wallet?.connected === false) {
        throw new Error('Wallet is not connected. Click "Reconnect wallet" and try again.');
      }
      // Approvals are signer-paid txs. On devnet, embedded wallets often have 0 SOL.
      const balanceRes = await fetch(`/api/wallet/balance?address=${encodeURIComponent(walletAddress)}`, {
        cache: 'no-store',
      });
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        const sol = Number(balanceData?.sol ?? 0);
        if (Number.isFinite(sol) && sol < 0.00001) {
          throw new Error('Insufficient SOL for transaction fee. Fund this wallet with a small amount of SOL and retry.');
        }
      }

      const actionPath = role === 'client' ? 'approve-client' : 'approve-freelancer';
      const res = await fetch(`/api/actions/invoice/${invoiceId}/${actionPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: walletAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || 'Failed to prepare approval transaction');

      const txBase64 = data?.transaction;
      if (!txBase64 || typeof txBase64 !== 'string') throw new Error('No transaction in response');

      const binary = atob(txBase64);
      const txBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) txBytes[i] = binary.charCodeAt(i);

      const txResult = await signAndSendTransaction({
        transaction: txBytes,
        wallet,
        chain: getChainForWallet(wallet),
      });

      const sig =
        typeof txResult === 'string' ? txResult :
        txResult instanceof Uint8Array ? bs58.encode(txResult) :
        txResult?.signature instanceof Uint8Array ? bs58.encode(txResult.signature) :
        typeof txResult?.signature === 'string' ? txResult.signature :
        'submitted';
      toast(`${role === 'client' ? 'Client' : 'Freelancer'} approval sent (${sig.slice(0, 10)}...)`, 'success');
      await loadApprovalStatus();
    } catch (err: any) {
      const message = err?.message || 'Failed to submit approval';
      if (message.includes('7050003') || message.includes('-32002')) {
        setError('Wallet session failed before broadcast. Reconnect wallet, then retry approval. If it persists, sign out/in and try again.');
      } else {
        setError(message);
      }
    } finally {
      setApprovingRole(null);
    }
  };

  const handleReconnectWallet = async () => {
    const wallet = pickPreferredSolanaWallet(solanaWallets) ?? fundingWallet;
    if (!wallet || typeof wallet.connect !== 'function') {
      setError('No reconnectable Solana wallet found. Please sign out and sign in again.');
      return;
    }
    setReconnectingWallet(true);
    setError('');
    try {
      await wallet.connect();
      setFundingWallet(wallet);
      toast('Wallet reconnected.', 'success');
    } catch (err: any) {
      setError(err?.message || 'Failed to reconnect wallet. Please sign out and sign in again.');
    } finally {
      setReconnectingWallet(false);
    }
  };

  const handleRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError('Please enter the release password'); return; }
    if (!clientApproved || !freelancerApproved) {
      setError('Both client and freelancer must approve on-chain before release.');
      return;
    }

    setReleasing(true);
    setError('');

    try {
      // Call the release API directly (password verification happens server-side)
      const response = await fetch(`/api/invoices/${invoiceId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to release funds');
      }

      if (data?.debug) {
        toast('Release debug mode is enabled: validation passed, but funds were not released on-chain.', 'warning');
        await loadInvoice();
        return;
      }

      toast('Funds released successfully! 🎉', 'success');
      await loadInvoice();
      router.push(`/invoice/${invoiceId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to release funds. Please check your password.');
    } finally {
      setReleasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center bg-white rounded-3xl border border-gray-100 shadow-sm p-12 max-w-sm">
            <h1 className="text-2xl font-bold mb-2 text-text">Invoice Not Found</h1>
            <p className="text-gray-400 text-sm mb-6">This invoice doesn&apos;t exist or was removed.</p>
            <Link href="/" className="btn-primary text-sm py-2.5 inline-block">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const workflowState = invoice.workflow_state ?? invoice.status;

  if (workflowState === 'released') {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-gray-50 px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center"
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Already Released</h1>
            <p className="text-gray-500 mb-6">Funds have already been distributed to the freelancer.</p>
            <Link href="/" className="btn-primary text-sm py-2.5 inline-block">Back to Home</Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (workflowState !== 'funded' && workflowState !== 'approvals') {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-gray-50 px-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Invoice Not Funded</h1>
            <p className="text-gray-500 mb-6 text-sm">This invoice has not been funded yet. Please complete payment first.</p>
            <Link href={`/pay/${invoiceId}`} className="btn-primary text-sm py-2.5 inline-block">Pay Invoice</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text">Release Funds</h1>
                <p className="text-sm text-gray-400">Confirm work is done before releasing</p>
              </div>
            </div>

            {/* Invoice summary */}
            <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="text-xl font-bold text-primary">
                  {Number(invoice.amount_usdc).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                </span>
              </div>
              {invoice.client_name && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Freelancer</span>
                  <span className="font-medium text-text">{invoice.client_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Status</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  {workflowState === 'approvals' ? 'Approvals Complete' : 'Funded — In Escrow'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Two-party approvals</p>
                {approvalLoading ? (
                  <span className="text-xs text-slate-400">Loading...</span>
                ) : (
                  <span className={`text-xs font-semibold ${clientApproved && freelancerApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {clientApproved && freelancerApproved ? 'Ready to release' : 'Waiting for approvals'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => submitApproval('client')}
                  disabled={approvalLoading || Boolean(approvingRole) || !isClientWallet}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    clientApproved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  } disabled:opacity-50`}
                >
                  {clientApproved ? 'Client approved' : approvingRole === 'client' ? 'Approving client...' : 'Approve as client'}
                </button>
                <button
                  type="button"
                  onClick={() => submitApproval('freelancer')}
                  disabled={approvalLoading || Boolean(approvingRole) || !isFreelancerWallet}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    freelancerApproved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  } disabled:opacity-50`}
                >
                  {freelancerApproved ? 'Freelancer approved' : approvingRole === 'freelancer' ? 'Approving freelancer...' : 'Approve as freelancer'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Each party must sign once with their own wallet before release can execute.
              </p>
              <button
                type="button"
                onClick={handleReconnectWallet}
                disabled={reconnectingWallet}
                className="mt-3 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                {reconnectingWallet ? 'Reconnecting wallet...' : 'Reconnect wallet'}
              </button>
              {connectedWalletAddress && (
                <p className="text-xs text-slate-500 mt-2 break-all">
                  Connected wallet: {connectedWalletAddress}
                </p>
              )}
              {!approvalLoading && connectedWalletAddress && !isClientWallet && !isFreelancerWallet && (
                <p className="text-xs text-amber-700 mt-2">
                  This wallet is not part of this escrow. Switch to the saved client or freelancer wallet to approve.
                </p>
              )}
            </div>

            <form onSubmit={handleRelease} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Release Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className={`input-field ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''}`}
                  placeholder="Enter release password"
                  autoComplete="current-password"
                />
                {error && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">This action cannot be undone</p>
                  <p className="text-xs text-amber-600 mt-1">Releasing funds transfers 99% to the freelancer and 1% to PivLink treasury.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={releasing || !password}
                className="w-full bg-primary text-white py-4 rounded-2xl font-semibold text-base hover:bg-blue-600 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
              >
                {releasing ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Releasing…
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Release Funds
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
