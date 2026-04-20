-- Explicit invoice workflow state machine:
-- created -> funded -> approvals -> released
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS workflow_state TEXT NOT NULL DEFAULT 'created',
ADD COLUMN IF NOT EXISTS reconcile_attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reconcile_next_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reconcile_last_error TEXT,
ADD COLUMN IF NOT EXISTS reconcile_last_checked_at TIMESTAMP WITH TIME ZONE;

-- Keep workflow_state in sync for existing rows based on current status.
UPDATE invoices
SET workflow_state = CASE
  WHEN status = 'released' THEN 'released'
  WHEN status = 'funded' THEN 'funded'
  ELSE 'created'
END
WHERE workflow_state IS NULL OR workflow_state = '';

-- Extend existing status domain with approvals if status is a text+check setup.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'invoices'
      AND column_name = 'status'
      AND data_type = 'text'
  ) THEN
    BEGIN
      ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
    EXCEPTION WHEN undefined_object THEN
      -- Constraint name can vary; ignore and continue.
      NULL;
    END;

    -- Best-effort check constraint for text status columns.
    BEGIN
      ALTER TABLE invoices
      ADD CONSTRAINT invoices_status_check
      CHECK (status IN ('created', 'funded', 'approvals', 'released', 'disputed'));
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Idempotency store for critical financial endpoints.
CREATE TABLE IF NOT EXISTS api_idempotency_keys (
  endpoint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  invoice_id TEXT,
  status_code INTEGER NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (endpoint, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_invoice
  ON api_idempotency_keys(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoices_workflow_state
  ON invoices(workflow_state);

CREATE INDEX IF NOT EXISTS idx_invoices_reconcile_next_retry
  ON invoices(reconcile_next_retry_at);
