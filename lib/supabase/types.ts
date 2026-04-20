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
  status: 'created' | 'funded' | 'approvals' | 'released' | 'disputed';
  workflow_state: 'created' | 'funded' | 'approvals' | 'released';
  mode: 'manual' | 'ai';
  release_password_hash?: string;
  escrow_initialized: boolean;
  escrow_initialized_at?: string;
  payment_tx_signature?: string;
  payment_tx_timestamp?: string;
  deposit_notification_tx?: string;
  reconcile_attempt_count?: number;
  reconcile_next_retry_at?: string;
  reconcile_last_error?: string;
  reconcile_last_checked_at?: string;
  created_at: string;
  updated_at: string;
}

