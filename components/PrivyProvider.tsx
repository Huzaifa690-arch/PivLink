'use client';

import React from 'react';
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

  return (
    <PrivyProviderBase
      appId={appId || ''}
      config={{
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc(solanaRpcUrl),
              rpcSubscriptions: createSolanaRpcSubscriptions(solanaWsUrl),
            },
            'solana:mainnet': {
              rpc: createSolanaRpc(solanaRpcUrl),
              rpcSubscriptions: createSolanaRpcSubscriptions(solanaWsUrl),
            },
          },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users',
          },
        },
        loginMethods: ['email', 'wallet'],
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
