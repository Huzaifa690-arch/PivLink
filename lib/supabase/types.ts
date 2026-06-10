export interface User {
  wallet_address: string;
  name: string;
  email?: string;
  role: 'freelancer';
  created_at: string;
}

export type KycIdType = 'passport' | 'drivers_license' | 'national_id';
export type KycStatus = 'pending' | 'approved' | 'rejected';

export interface UserKyc {
  wallet_address: string;
  full_name: string;
  date_of_birth: string;
  country: string;
  id_type: KycIdType;
  id_number: string;
  id_document_path?: string | null;
  status: KycStatus;
  rejection_reason?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  updated_at: string;
}

export type PaymentProvider = 'stripe' | 'privy' | 'blink' | 'unknown';
export type OnrampProvider = 'stripe';
export type OnrampStatus =
  | 'created'
  | 'requires_action'
  | 'processing'
  | 'fulfilled'
  | 'failed'
  | 'expired';

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
  payment_provider?: PaymentProvider | null;
  onramp_provider?: OnrampProvider | null;
  onramp_session_id?: string | null;
  onramp_status?: OnrampStatus | null;
  onramp_fiat_amount?: number | null;
  onramp_fiat_currency?: string | null;
  onramp_destination_tx?: string | null;
  onramp_error_code?: string | null;
  onramp_error_message?: string | null;
  funded_at?: string | null;
  payment_tx_signature?: string;
  payment_tx_timestamp?: string;
  release_tx_signature?: string;
  transaction_transparency_signature?: string;
  transaction_transparency_payload?: Record<string, unknown>;
  transaction_transparency_generated_at?: string;
  deposit_notification_tx?: string;
  reconcile_attempt_count?: number;
  reconcile_next_retry_at?: string;
  reconcile_last_error?: string;
  reconcile_last_checked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StripeOnrampEvent {
  event_id: string;
  invoice_id?: string | null;
  session_id?: string | null;
  event_type: string;
  payload_json: Record<string, unknown>;
  received_at: string;
}

