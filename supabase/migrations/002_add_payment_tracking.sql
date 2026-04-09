-- Add payment tracking columns to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS escrow_initialized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS escrow_initialized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_tx_signature TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_tx_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deposit_notification_tx TEXT DEFAULT NULL;

-- Create index for payment lookup
CREATE INDEX IF NOT EXISTS idx_invoices_payment_tx ON invoices(payment_tx_signature);
