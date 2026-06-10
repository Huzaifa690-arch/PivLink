-- Stripe Crypto Onramp tracking for invoice card payments
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_provider TEXT,
ADD COLUMN IF NOT EXISTS onramp_provider TEXT,
ADD COLUMN IF NOT EXISTS onramp_session_id TEXT,
ADD COLUMN IF NOT EXISTS onramp_status TEXT,
ADD COLUMN IF NOT EXISTS onramp_fiat_amount NUMERIC,
ADD COLUMN IF NOT EXISTS onramp_fiat_currency TEXT DEFAULT 'usd',
ADD COLUMN IF NOT EXISTS onramp_destination_tx TEXT,
ADD COLUMN IF NOT EXISTS onramp_error_code TEXT,
ADD COLUMN IF NOT EXISTS onramp_error_message TEXT,
ADD COLUMN IF NOT EXISTS funded_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_onramp_session_id
  ON invoices(onramp_session_id)
  WHERE onramp_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_onramp_status
  ON invoices(onramp_status)
  WHERE onramp_status IS NOT NULL;

CREATE TABLE IF NOT EXISTS stripe_onramp_events (
  event_id TEXT PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_onramp_events_invoice
  ON stripe_onramp_events(invoice_id);

CREATE INDEX IF NOT EXISTS idx_stripe_onramp_events_session
  ON stripe_onramp_events(session_id);
