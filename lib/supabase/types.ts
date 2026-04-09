export interface User {
  wallet_address: string;
  name: string;
  email?: string;
  role: 'freelancer';
  created_at: string;
}

export interface Invoice {
  id: string;
  freelancer_wallet: string;
  client_name?: string;
  amount_usdc: number;
  vault_address: string;
  status: 'created' | 'funded' | 'released' | 'disputed';
  mode: 'manual' | 'ai';
  release_password_hash?: string;
  escrow_initialized: boolean;
  escrow_initialized_at?: string;
  payment_tx_signature?: string;
  payment_tx_timestamp?: string;
  deposit_notification_tx?: string;
  created_at: string;
  updated_at: string;
}

