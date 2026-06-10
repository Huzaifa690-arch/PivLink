'use client';

import React, { useMemo } from 'react';
import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID is not set. Privy will not work properly.');
    return <>{children}</>;
  }

  const solanaRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const solanaWsUrl = solanaRpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  const configuredNetwork =
    (process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' || solanaRpcUrl.toLowerCase().includes('mainnet'))
      ? 'solana:mainnet'
      : 'solana:devnet';
  const enableExternalWallets = process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_SOLANA_WALLETS === 'true';
  const availableSolanaConnectors = useMemo(() => toSolanaWalletConnectors(), []);
  const hasSolanaConnectors = useMemo(() => {
    const values = Object.values(availableSolanaConnectors as Record<string, unknown>);
    if (values.length === 0) return false;
    return values.some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    });
  }, [availableSolanaConnectors]);
  const shouldEnableExternalWallets = enableExternalWallets && hasSolanaConnectors;

  const solanaRpcConfig = useMemo(() => {
    return {
      [configuredNetwork]: {
        rpc: createSolanaRpc(solanaRpcUrl),
        rpcSubscriptions: createSolanaRpcSubscriptions(solanaWsUrl),
      },
    } as const;
  }, [configuredNetwork, solanaRpcUrl, solanaWsUrl]);

  const externalSolanaConfig = useMemo(() => {
    if (!shouldEnableExternalWallets) return undefined;
    return {
      solana: {
        connectors: availableSolanaConnectors,
      },
    };
  }, [availableSolanaConnectors, shouldEnableExternalWallets]);
  const loginMethods = useMemo(() => {
    // If external wallet connectors are disabled, don't advertise wallet login.
    // Users can still log in via email and get an embedded Solana wallet.
    return shouldEnableExternalWallets ? (['email', 'wallet'] as const) : (['email'] as const);
  }, [shouldEnableExternalWallets]);

  return (
    <PrivyProviderBase
      appId={appId || ''}
      config={{
        solana: {
          rpcs: solanaRpcConfig,
        },
        externalWallets: externalSolanaConfig,
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users',
          },
        },
        loginMethods: [...loginMethods],
        appearance: {
          theme: 'light',
          accentColor: '#0055FF',
        },
      }}
    >
      {children}
    </PrivyProviderBase>
  );
}
