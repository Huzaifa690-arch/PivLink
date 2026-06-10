-- Self-attested KYC for app sign-in gate

CREATE TABLE IF NOT EXISTS user_kyc (
  wallet_address TEXT PRIMARY KEY REFERENCES users(wallet_address) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  country TEXT NOT NULL,
  id_type TEXT NOT NULL CHECK (id_type IN ('passport', 'drivers_license', 'national_id')),
  id_number TEXT NOT NULL,
  id_document_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_kyc_status ON user_kyc(status);
CREATE INDEX IF NOT EXISTS idx_user_kyc_submitted_at ON user_kyc(submitted_at DESC);

CREATE TRIGGER update_user_kyc_updated_at BEFORE UPDATE ON user_kyc
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Private bucket for optional ID document uploads.
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;
