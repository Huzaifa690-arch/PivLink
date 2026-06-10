'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const LAST_UPDATED = 'May 5, 2026';
const LAST_REVIEWED = 'May 5, 2026';

const pillars = [
  { title: 'On-chain enforcement', desc: 'USDC movement follows program rules; escrow is not a manual bank transfer.', badge: 'Core' },
  { title: 'Encryption & access', desc: 'TLS in transit, least-privilege keys, and database access controls.', badge: 'Platform' },
  { title: 'Identity & wallets', desc: 'Privy-managed sessions with MFA options and embedded wallet security.', badge: 'Auth' },
  { title: 'Monitoring & audit', desc: 'Structured audit events and transparency signatures for invoice state.', badge: 'Ops' },
];

const toc = [
  { id: 'architecture', label: 'Architecture Overview' },
  { id: 'onchain', label: 'On-Chain Security' },
  { id: 'auth', label: 'Authentication & Wallets' },
  { id: 'password', label: 'Release Password' },
  { id: 'offchain', label: 'Off-Chain Data' },
  { id: 'appsec', label: 'Application Security' },
  { id: 'opsec', label: 'Operational Security' },
  { id: 'monitoring', label: 'Monitoring & Audit Trail' },
  { id: 'bcr', label: 'Backup & Continuity' },
  { id: 'vuln', label: 'Vulnerability Management' },
  { id: 'disclosure', label: 'Responsible Disclosure' },
  { id: 'incident', label: 'Incident Response' },
  { id: 'compliance', label: 'Compliance Posture' },
  { id: 'your-role', label: 'Your Role' },
  { id: 'contact', label: 'Contact' },
];

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.article
      id={id}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="scroll-mt-28 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm"
    >
      <h2 className="text-xl font-bold text-slate-950 mb-4">
        {n}. {title}
      </h2>
      <div className="max-w-none text-slate-600 text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-slate-800">
        {children}
      </div>
    </motion.article>
  );
}

export default function SecurityPage() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-slate-100 py-16 md:py-24 px-6">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%)]" />
        <div className="relative max-w-6xl mx-auto">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-600 font-semibold mb-4">Trust & safety</p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950 mb-6">Data Security at PivLinks</h1>
          <p className="text-lg text-slate-600 max-w-3xl mb-10">
            PivLinks combines public-blockchain escrow with off-chain orchestration. This page summarizes how we protect
            accounts, data, and operations. It reflects our V1 architecture; capabilities evolve—see{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Terms
            </Link>{' '}
            for service scope.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-10">
            <span>
              <strong className="text-slate-700">Last updated:</strong> {LAST_UPDATED}
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              <strong className="text-slate-700">Last reviewed:</strong> {LAST_REVIEWED}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm"
              >
                <span className="inline-flex text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md mb-3">
                  {p.badge}
                </span>
                <h3 className="text-lg font-semibold text-slate-950 mb-2">{p.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-10">
            <Link href="/privacy" className="btn-primary inline-flex items-center justify-center text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms" className="btn-outline inline-flex items-center justify-center text-sm">
              Terms of Service
            </Link>
            <a
              href="mailto:security@pivlinks.example.com"
              className="btn-outline inline-flex items-center justify-center text-sm"
            >
              Report an issue
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 grid gap-10 lg:grid-cols-[minmax(0,220px)_1fr] items-start">
        <nav
          aria-label="Table of contents"
          className="lg:sticky lg:top-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-sm"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-4 font-semibold">On this page</p>
          <ul className="space-y-2">
            {toc.map((item, i) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-slate-600 hover:text-blue-600 transition-colors">
                  {i + 1}. {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-8">
          <Section id="architecture" n={1} title="Architecture Overview">
            <p>
              <strong>Request path (simplified):</strong> User browser → TLS → Vercel edge / Next.js application → API
              routes → Supabase (PostgreSQL) + Privy (auth / payments) + Solana RPC → on-chain programs.
            </p>
            <p>
              <strong>Design principle:</strong> Money movement is enforced on-chain by the escrow program; the backend
              coordinates metadata, verification, and signing workflows. This separation reduces reliance on opaque
              custodial ledgers while introducing blockchain-specific risks (see{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms
              </Link>
              ).
            </p>
          </Section>

          <Section id="onchain" n={2} title="On-Chain Security">
            <ul>
              <li>
                <strong>Anchor program</strong> — Escrow logic is implemented in a Solana program with explicit checks
                (e.g., USDC mint validation, vault balances, authorized flows).
              </li>
              <li>
                <strong>PDA vaults</strong> — Per-invoice PDAs isolate funds and reduce cross-invoice bleed.
              </li>
              <li>
                <strong>Fee split</strong> — Release paths enforce configured splits (e.g., 99% freelancer / 1% treasury)
                at the program level where deployed.
              </li>
              <li>
                <strong>Transparency signatures</strong> — We compute a SHA-256 digest over a structured payload (invoice
                id, wallets, amounts, tx signatures, status) and store it with the invoice record to support integrity
                checks of disclosed state.
              </li>
              <li>
                <strong>Public audit trail</strong> — Anyone with a Solana explorer can verify transactions; privacy is
                limited for amounts and addresses involved.
              </li>
            </ul>
          </Section>

          <Section id="auth" n={3} title="Authentication & Wallet Security">
            <p>
              Authentication and embedded wallets are provided through Privy. We encourage users to enable multi-factor
              authentication where available, protect device passcodes, and revoke sessions on lost devices.
            </p>
            <p>
              Wallet private keys are managed by Privy&apos;s infrastructure under their security model; review Privy&apos;s
              documentation for MPC/HSM and recovery details.
            </p>
          </Section>

          <Section id="password" n={4} title="Release Password Handling">
            <ul>
              <li>Release passwords are hashed (e.g., bcrypt) before storage; plaintext is not retained.</li>
              <li>Passwords are not returned by APIs and should not be logged in application telemetry.</li>
              <li>Rate limiting and monitoring reduce brute-force attempts against release endpoints.</li>
              <li>Users must treat the release password like a wire authorization code—anyone with it may enable release.</li>
            </ul>
          </Section>

          <Section id="offchain" n={5} title="Off-Chain Data Protection">
            <ul>
              <li>
                <strong>In transit:</strong> HTTPS/TLS 1.2+ for browser and API traffic.
              </li>
              <li>
                <strong>At rest:</strong> Supabase-managed encryption for database storage; backups inherit provider
                controls.
              </li>
              <li>
                <strong>Access control:</strong> Row Level Security (RLS) policies and service-role keys scoped to server
                environments only.
              </li>
              <li>
                <strong>Secrets:</strong> Environment variables in Vercel (or equivalent) for Supabase keys, Privy
                credentials, and signing material—never committed to source control.
              </li>
            </ul>
          </Section>

          <Section id="appsec" n={6} title="Application Security">
            <ul>
              <li>Input validation on API routes; parameterized queries via Supabase clients.</li>
              <li>Session verification through Privy before sensitive operations.</li>
              <li>CORS and security headers configured per deployment best practices.</li>
              <li>Dependency updates and static analysis integrated into development workflow (roadmap: CI gates).</li>
            </ul>
          </Section>

          <Section id="opsec" n={7} title="Operational Security">
            <ul>
              <li>Least-privilege access to production data; administrative actions logged where feasible.</li>
              <li>
                <strong>V1 signing model:</strong> A controlled operational key may sign certain release transactions.
                This reduces client-side friction but concentrates operational risk—see README and roadmap for migration
                toward client-signed releases.
              </li>
              <li>Key rotation procedures for API keys and infrastructure credentials.</li>
            </ul>
          </Section>

          <Section id="monitoring" n={8} title="Monitoring, Logging & Audit Trail">
            <p>
              Security-relevant actions are recorded in the `activity_audit_events` table (see migration 004) with
              timestamps, actors, and JSON metadata for investigations.
            </p>
            <p>
              Invoice-level transparency signatures (see `lib/api/transparency.ts`) help detect tampering of disclosed
              off-chain summaries relative to on-chain references.
            </p>
            <p>
              Alerts may cover failed releases, unusual dispute volume, or authentication anomalies—coverage expands with
              product maturity.
            </p>
          </Section>

          <Section id="bcr" n={9} title="Backup, Continuity & Recovery">
            <ul>
              <li>Supabase provides automated backups; point-in-time recovery options depend on your project plan.</li>
              <li>
                <strong>RTO/RPO targets (placeholder):</strong> RTO 4h / RPO 1h for database tier—confirm in production
                runbooks.
              </li>
              <li>Blockchain data is replicated by Solana validators; recovery focuses on off-chain state reconciliation.</li>
            </ul>
          </Section>

          <Section id="vuln" n={10} title="Vulnerability Management">
            <ul>
              <li>Regular dependency review; critical CVEs patched on expedited timelines.</li>
              <li>Smart-contract changes require testnet validation and peer review before mainnet promotion.</li>
              <li>Third-party penetration tests and formal audits may be scheduled as the product matures—results published
                when available.</li>
            </ul>
          </Section>

          <Section id="disclosure" n={11} title="Responsible Disclosure">
            <p>
              We welcome coordinated disclosure of security vulnerabilities. Please email{' '}
              <a href="mailto:security@pivlinks.example.com" className="text-blue-600 hover:underline">
                security@pivlinks.example.com
              </a>{' '}
              with encrypted details if possible (PGP key placeholder: publish before production).
            </p>
            <p>
              <strong>Scope (illustrative):</strong> pivlinks domains, API endpoints, smart-contract escrow flows, and
              mobile/web clients. Out of scope: third-party spam, social engineering, or physical attacks.
            </p>
            <p>
              <strong>Safe harbor:</strong> We will not pursue legal action for good-faith research that complies with this
              policy, does not degrade service, and allows reasonable time to remediate before public disclosure.
            </p>
            <p>
              <strong>SLA (goal):</strong> Initial response within 72 hours; critical issues prioritized for mitigation.
            </p>
          </Section>

          <Section id="incident" n={12} title="Incident Response">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Detection</strong> — automated alerts, user reports, or provider notifications.
              </li>
              <li>
                <strong>Containment</strong> — isolate affected systems, rotate credentials, pause risky features.
              </li>
              <li>
                <strong>Eradication & recovery</strong> — patch vulnerabilities, restore from clean backups, verify chain
                reconciliation.
              </li>
              <li>
                <strong>Notification</strong> — inform affected users and regulators as required (e.g., GDPR breach
                notifications without undue delay, within 72 hours where applicable).
              </li>
              <li>
                <strong>Post-incident review</strong> — root-cause analysis and preventive controls.
              </li>
            </ol>
          </Section>

          <Section id="compliance" n={13} title="Compliance & Standards Posture">
            <p>
              <strong>Current state:</strong> We implement baseline security controls suitable for an early-stage product
              handling financial workflows. We are not yet SOC 2 Type II certified; certification may be pursued as
              customer demand requires.
            </p>
            <p>
              <strong>Roadmap:</strong> Expanded logging, formal access reviews, vendor risk program, and continuous
              compliance monitoring.
            </p>
            <p>
              <strong>Regulatory:</strong> We design processes with GDPR, CCPA, AML/sanctions screening, and recordkeeping
              obligations in mind—see{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section id="your-role" n={14} title="Your Role in Security">
            <ul>
              <li>Enable MFA on your Privy account; use unique passwords and device locks.</li>
              <li>Share invoice and release links only with trusted counterparties over secure channels.</li>
              <li>Verify domain names and TLS certificates before entering credentials.</li>
              <li>Store release passwords offline or in a password manager; never paste them into public chats.</li>
              <li>Report suspicious emails or impersonation attempts to security@pivlinks.example.com.</li>
            </ul>
          </Section>

          <Section id="contact" n={15} title="Contact">
            <p>
              <strong>Security issues:</strong>{' '}
              <a href="mailto:security@pivlinks.example.com" className="text-blue-600 hover:underline">
                security@pivlinks.example.com
              </a>
            </p>
            <p>
              <strong>Privacy:</strong>{' '}
              <a href="mailto:privacy@pivlinks.example.com" className="text-blue-600 hover:underline">
                privacy@pivlinks.example.com
              </a>
            </p>
            <p>
              <Link href="/contact" className="text-blue-600 hover:underline">
                General contact
              </Link>
            </p>
          </Section>
        </div>
      </div>

      <section className="bg-slate-950 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400 mb-2">Legal</p>
            <p className="text-2xl font-bold">Policies & terms</p>
            <p className="text-slate-400 text-sm mt-2">Privacy practices and contractual terms for using PivLinks.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/privacy" className="btn-primary inline-flex items-center justify-center text-sm">
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
