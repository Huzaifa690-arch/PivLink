-- Disputes and support ticketing MVP

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  requester_wallet TEXT,
  requester_email TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('dispute', 'payment_stuck', 'released_early', 'work_incomplete', 'other')
  ),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  raised_by_wallet TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved_client', 'resolved_freelancer', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  dispute_id UUID REFERENCES invoice_disputes(id) ON DELETE SET NULL,
  actor TEXT,
  actor_wallet TEXT,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_invoice ON support_tickets(invoice_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_invoice ON invoice_disputes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_status ON invoice_disputes(status);
CREATE INDEX IF NOT EXISTS idx_activity_audit_events_invoice ON activity_audit_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_activity_audit_events_created_at ON activity_audit_events(created_at DESC);

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_disputes_updated_at BEFORE UPDATE ON invoice_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
