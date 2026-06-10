'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const LAST_UPDATED = 'May 5, 2026';
const LAST_REVIEWED = 'May 5, 2026';

const toc = [
  { id: 'summary', label: 'Summary at a Glance' },
  { id: 'who', label: 'Who We Are & Scope' },
  { id: 'collect', label: 'Information We Collect' },
  { id: 'use', label: 'How We Use Information' },
  { id: 'legal-bases', label: 'Legal Bases (GDPR)' },
  { id: 'sharing', label: 'Sharing & Sub-processors' },
  { id: 'transfers', label: 'International Transfers' },
  { id: 'retention', label: 'Retention' },
  { id: 'security', label: 'Security' },
  { id: 'cookies', label: 'Cookies & Tracking' },
  { id: 'rights', label: 'Your Rights' },
  { id: 'automated', label: 'Automated Decision-Making' },
  { id: 'children', label: 'Children' },
  { id: 'dnt', label: 'Do Not Track' },
  { id: 'links', label: 'Third-Party Links' },
  { id: 'changes', label: 'Changes' },
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
      <div className="max-w-none text-slate-600 text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_table]:text-xs [&_th]:text-left [&_th]:font-semibold [&_th]:text-slate-800 [&_td]:py-2 [&_td]:pr-4 [&_strong]:text-slate-800">
        {children}
      </div>
    </motion.article>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-slate-100 py-16 md:py-24 px-6">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%)]" />
        <div className="relative max-w-6xl mx-auto">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-600 font-semibold mb-4">Legal</p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950 mb-6">
            Privacy Policy
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mb-6">
            This Policy describes how PivLinks (&quot;we&quot;, &quot;us&quot;) collects, uses, discloses, and protects
            personal information when you use our websites, applications, and escrow payment services. It is designed to
            align with GDPR, UK GDPR, and CCPA/CPRA expectations; it is not a substitute for legal advice.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-8">
            <span>
              <strong className="text-slate-700">Last updated:</strong> {LAST_UPDATED}
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              <strong className="text-slate-700">Last reviewed:</strong> {LAST_REVIEWED}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/terms" className="btn-primary inline-flex items-center justify-center text-sm">
              Terms of Service
            </Link>
            <Link href="/security" className="btn-outline inline-flex items-center justify-center text-sm">
              Data Security
            </Link>
            <Link href="/contact" className="btn-outline inline-flex items-center justify-center text-sm">
              Contact
            </Link>
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
          <Section id="summary" n={1} title="Summary at a Glance">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-slate-100">
                  <th className="py-3 align-top w-[28%]">What we collect</th>
                  <td className="py-3">
                    Account data (e.g., email, name), wallet addresses, invoice and payment metadata, support and dispute
                    content, device/technical logs, and on-chain data that is public by design.
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-3 align-top">Why we use it</th>
                  <td className="py-3">
                    To provide escrow and invoicing, authenticate users, prevent fraud, comply with law, improve the
                    Service, and communicate with you.
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-3 align-top">Who we share with</th>
                  <td className="py-3">
                    Infrastructure providers (e.g., Privy, Supabase, Vercel), blockchain networks (public), payment
                    processors, and authorities when required.
                  </td>
                </tr>
                <tr>
                  <th className="py-3 align-top">Your rights</th>
                  <td className="py-3">
                    Access, correction, deletion (where feasible), restriction, objection, portability, and
                    non-discrimination—subject to legal exceptions and on-chain immutability (see Section 11).
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section id="who" n={2} title="Who We Are & Scope">
            <p>
              <strong>Controller (placeholder):</strong> PivLinks, [legal entity name], [registered address]. For EU/UK
              data subjects, we will designate a representative where required (contact below).
            </p>
            <p>
              This Policy applies to personal information processed in connection with the Service. It does not apply to
              third-party sites or services that we link to.
            </p>
          </Section>

          <Section id="collect" n={3} title="Information We Collect">
            <p>
              <strong>Account & identity:</strong> Name, email, organization, and similar profile fields; Solana wallet
              addresses associated with your Privy session; optional KYC/KYB documents if we request verification.
            </p>
            <p>
              <strong>Transactional:</strong> Invoice identifiers, amounts, statuses, release password{' '}
              <em>hashes</em> (we do not store plaintext release passwords), payment and release transaction signatures
              where recorded, and workflow timestamps.
            </p>
            <p>
              <strong>On-chain:</strong> Wallet addresses, token transfers, program logs, and transaction IDs on Solana
              are <strong>public</strong> and replicated globally; we cannot delete blockchain history.
            </p>
            <p>
              <strong>Technical:</strong> IP address, device type, browser, approximate location derived from IP, cookies
              and similar technologies, diagnostics, and security logs.
            </p>
            <p>
              <strong>Communications:</strong> Support tickets, dispute evidence, emails, and messages you send us,
              including attachments.
            </p>
            <p>
              <strong>Integrity & transparency records:</strong> We may store a SHA-256 &quot;transaction transparency
              signature&quot; and payload snapshot per invoice to help verify that off-chain records match disclosed
              on-chain state (see our security page).
            </p>
          </Section>

          <Section id="use" n={4} title="How We Use Information">
            <ul>
              <li>Provide, secure, and improve the Service (including escrow orchestration and UI).</li>
              <li>Authenticate sessions, prevent fraud, enforce sanctions screening, and protect users.</li>
              <li>Operate support, disputes, and audit trails (including writes to our `activity_audit_events` table).</li>
              <li>Comply with legal obligations and respond to lawful requests.</li>
              <li>Send service-related notices; with consent, send marketing (you may opt out).</li>
              <li>Generate aggregated or de-identified analytics that do not identify you.</li>
            </ul>
          </Section>

          <Section id="legal-bases" n={5} title="Legal Bases (GDPR)">
            <p>Where GDPR applies, we rely on one or more of:</p>
            <ul>
              <li>
                <strong>Contract</strong> — processing necessary to provide the Service you request.
              </li>
              <li>
                <strong>Legitimate interests</strong> — securing the platform, fraud prevention, product analytics,
                internal reporting, and dispute handling, balanced against your rights.
              </li>
              <li>
                <strong>Legal obligation</strong> — AML, sanctions, tax, and regulatory compliance.
              </li>
              <li>
                <strong>Consent</strong> — non-essential cookies, certain marketing, or optional programs where required.
              </li>
            </ul>
          </Section>

          <Section id="sharing" n={6} title="Sharing & Sub-processors">
            <ul>
              <li>
                <strong>Privy</strong> — authentication, embedded wallets, and card payments.
              </li>
              <li>
                <strong>Supabase</strong> — hosted PostgreSQL, auth-related storage, and application data.
              </li>
              <li>
                <strong>Vercel</strong> — application hosting, edge routing, and operational logs.
              </li>
              <li>
                <strong>Solana validators & RPC providers</strong> — transaction broadcast and read access;{' '}
                <strong>on-chain data is public</strong>.
              </li>
              <li>
                <strong>Circle / USDC ecosystem</strong> — stablecoin issuance rules and compliance may apply to USDC
                usage.
              </li>
              <li>
                <strong>Professional advisors, acquirers, or lenders</strong> — under confidentiality obligations.
              </li>
              <li>
                <strong>Law enforcement & regulators</strong> — when required by law or to protect rights and safety.
              </li>
            </ul>
            <p>We do not sell your personal information as defined under CCPA/CPRA.</p>
          </Section>

          <Section id="transfers" n={7} title="International Data Transfers">
            <p>
              We may process data in the United States and other countries. Where GDPR/UK GDPR applies, we use appropriate
              safeguards such as Standard Contractual Clauses, UK Addendum, or adequacy decisions. You may request a copy
              of relevant mechanisms by contacting us.
            </p>
          </Section>

          <Section id="retention" n={8} title="Retention">
            <ul>
              <li>
                <strong>Account & invoices:</strong> For the life of the account and a reasonable period thereafter,
                unless longer retention is required for disputes or law.
              </li>
              <li>
                <strong>Financial & compliance records:</strong> Up to <strong>seven (7) years</strong> where required
                for AML, tax, or audit.
              </li>
              <li>
                <strong>Security & application logs:</strong> Typically <strong>30–90 days</strong>, unless needed for an
                investigation.
              </li>
              <li>
                <strong>Support & disputes:</strong> Often <strong>12–24 months</strong> after closure unless legal hold
                applies.
              </li>
              <li>
                <strong>Audit events:</strong> Stored in `activity_audit_events` with timestamps for security and
                compliance traceability; retained per internal policy and legal requirements.
              </li>
            </ul>
          </Section>

          <Section id="security" n={9} title="Security">
            <p>
              We implement administrative, technical, and organizational measures described in our{' '}
              <Link href="/security" className="text-blue-600 hover:underline">
                Data Security
              </Link>{' '}
              page, including encryption in transit, access controls, and monitoring. No method is 100% secure; you use
              the Service at your own risk.
            </p>
          </Section>

          <Section id="cookies" n={10} title="Cookies & Similar Technologies">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2">Control</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-800">Strictly necessary</td>
                  <td className="py-2">Session, authentication, security, load balancing.</td>
                  <td className="py-2">Required for Service; cannot be disabled without breaking core features.</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-800">Functional</td>
                  <td className="py-2">Preferences, language, UI state.</td>
                  <td className="py-2">Adjust in browser or in-app settings where available.</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-800">Analytics</td>
                  <td className="py-2">Understanding usage and reliability (e.g., Vercel Analytics if enabled).</td>
                  <td className="py-2">Opt out via cookie banner or browser controls where offered.</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section id="rights" n={11} title="Your Rights">
            <p>
              <strong>GDPR/UK GDPR:</strong> You may request access, rectification, erasure, restriction of processing,
              objection to certain processing, data portability, and to lodge a complaint with a supervisory authority.
            </p>
            <p>
              <strong>CCPA/CPRA (California):</strong> You may request to know categories and specific pieces of personal
              information we collect, to delete personal information, to correct inaccurate information, and to opt out of
              sale/sharing (we do not sell). We will not discriminate for exercising rights.
            </p>
            <p>
              <strong>How to exercise:</strong> Email{' '}
              <a href="mailto:privacy@pivlinks.example.com" className="text-blue-600 hover:underline">
                privacy@pivlinks.example.com
              </a>{' '}
              with sufficient detail for us to verify your identity. We may need additional information to protect your
              account.
            </p>
            <p>
              <strong>On-chain immutability & hashed secrets:</strong> We cannot erase data that exists on public
              blockchains or that third parties have copied. Release password hashes may need to be retained for fraud
              investigations and integrity checks even after account closure. Where deletion conflicts with legal
              obligations, we will explain the limitation.
            </p>
          </Section>

          <Section id="automated" n={12} title="Automated Decision-Making">
            <p>
              We may use automated tools for fraud scoring, sanctions screening, and anomaly detection. These may produce
              legal or similarly significant effects in limited cases (e.g., blocking a transaction). You may request human
              review of such decisions where applicable law requires.
            </p>
          </Section>

          <Section id="children" n={13} title="Children&apos;s Privacy">
            <p>
              The Service is not directed to individuals under 18. We do not knowingly collect personal information from
              children. If you believe we have, contact us for prompt deletion.
            </p>
          </Section>

          <Section id="dnt" n={14} title="Do Not Track">
            <p>
              There is no consistent industry standard for DNT signals. We currently do not respond to browser DNT flags;
              you may manage cookies through browser settings and any in-app controls we provide.
            </p>
          </Section>

          <Section id="links" n={15} title="Third-Party Links">
            <p>
              Links to third-party sites are provided for convenience. Their privacy practices are governed by their own
              policies; please review them before sharing information.
            </p>
          </Section>

          <Section id="changes" n={16} title="Changes to This Policy">
            <p>
              We may update this Policy from time to time. We will post the revised version and update the &quot;Last
              updated&quot; date. Material changes may require additional notice. Continued use after the effective date
              constitutes acceptance unless objection is permitted by law.
            </p>
          </Section>

          <Section id="contact" n={17} title="Contact">
            <p>
              <strong>Privacy inquiries:</strong>{' '}
              <a href="mailto:privacy@pivlinks.example.com" className="text-blue-600 hover:underline">
                privacy@pivlinks.example.com
              </a>
            </p>
            <p>
              <strong>Data Protection Officer (placeholder):</strong> dpo@pivlinks.example.com
            </p>
            <p>
              <strong>EU/UK representative (placeholder):</strong> [Name, address] — to be appointed before serving EU/UK
              users at scale.
            </p>
            <p>
              <Link href="/contact" className="text-blue-600 hover:underline">
                General contact form
              </Link>
            </p>
          </Section>
        </div>
      </div>

      <section className="bg-slate-950 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400 mb-2">Related</p>
            <p className="text-2xl font-bold">Terms & security</p>
            <p className="text-slate-400 text-sm mt-2">Rules of use and how we protect the platform.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/terms" className="btn-primary inline-flex items-center justify-center text-sm">
              Terms of Service
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Data Security
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
