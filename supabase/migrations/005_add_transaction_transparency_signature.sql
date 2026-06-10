-- Transaction signature transparency metadata for user-facing authenticity checks
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS release_tx_signature TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transaction_transparency_signature TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transaction_transparency_payload JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transaction_transparency_generated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_invoices_release_tx_signature ON invoices(release_tx_signature);
CREATE INDEX IF NOT EXISTS idx_invoices_transparency_signature ON invoices(transaction_transparency_signature);
