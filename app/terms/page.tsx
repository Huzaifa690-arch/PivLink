'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const EFFECTIVE = 'May 5, 2026';
const LAST_UPDATED = 'May 5, 2026';
const LAST_REVIEWED = 'May 5, 2026';

const toc = [
  { id: 'acceptance', label: 'Acceptance & Eligibility' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'account', label: 'Account & Authentication' },
  { id: 'service', label: 'Service Description' },
  { id: 'roles', label: 'Roles & Responsibilities' },
  { id: 'fees', label: 'Fees & Payments' },
  { id: 'release', label: 'Release Password & Funds' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'acceptable-use', label: 'Acceptable Use' },
  { id: 'crypto-risks', label: 'Crypto & Blockchain Risks' },
  { id: 'ip', label: 'Intellectual Property' },
  { id: 'third-party', label: 'Third-Party Services' },
  { id: 'kyc', label: 'KYC / AML / Sanctions' },
  { id: 'tax', label: 'Tax' },
  { id: 'termination', label: 'Termination' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Limitation of Liability' },
  { id: 'indemnity', label: 'Indemnification' },
  { id: 'governing', label: 'Governing Law & Arbitration' },
  { id: 'force-majeure', label: 'Force Majeure' },
  { id: 'changes', label: 'Changes to Terms' },
  { id: 'misc', label: 'Miscellaneous' },
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
      <div className="max-w-none text-slate-600 text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-slate-800">
        {children}
      </div>
    </motion.article>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-slate-100 py-16 md:py-24 px-6">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%)]" />
        <div className="relative max-w-6xl mx-auto">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-600 font-semibold mb-4">Legal</p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950 mb-6">
            Terms of Service
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mb-6">
            These Terms govern your use of PivLinks&apos; escrow payment platform, including invoice creation, funding, release,
            disputes, and related services. PivLinks V1 is provided on an &quot;as is&quot; basis; obtain independent legal advice
            before relying on these Terms in production.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-8">
            <span>
              <strong className="text-slate-700">Effective:</strong> {EFFECTIVE}
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              <strong className="text-slate-700">Last updated:</strong> {LAST_UPDATED}
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              <strong className="text-slate-700">Last reviewed:</strong> {LAST_REVIEWED}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/privacy" className="btn-primary inline-flex items-center justify-center text-sm">
              Privacy Policy
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
          <Section id="acceptance" n={1} title="Acceptance & Eligibility">
            <p>
              By accessing or using PivLinks (&quot;Service&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;) and our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the Service.
            </p>
            <p>
              You represent that you are at least 18 years old and have full legal capacity to enter contracts in your
              jurisdiction. You may not use the Service if you are located in, ordinarily resident in, or organized under
              the laws of any jurisdiction subject to comprehensive U.S. sanctions, FATF blacklist jurisdictions (as
              updated), or where use of digital assets or escrow services is prohibited.
            </p>
            <p>
              If you use the Service on behalf of an entity, you represent that you have authority to bind that entity,
              and &quot;you&quot; includes that entity.
            </p>
          </Section>

          <Section id="definitions" n={2} title="Definitions">
            <ul>
              <li>
                <strong>Service:</strong> PivLinks&apos; websites, applications, APIs, and related escrow orchestration
                for invoices.
              </li>
              <li>
                <strong>Freelancer:</strong> A user who creates an invoice and expects payment upon release.
              </li>
              <li>
                <strong>Client:</strong> A user (or payer) who funds an invoice and may authorize release.
              </li>
              <li>
                <strong>Escrow Vault:</strong> An on-chain program-controlled account (PDA) on Solana holding USDC for a
                specific invoice until release conditions are met.
              </li>
              <li>
                <strong>Release Password:</strong> A secret chosen by the Freelancer and shared with the Client to
                authorize release; stored only as a cryptographic hash off-chain.
              </li>
              <li>
                <strong>Treasury Fee:</strong> A protocol fee (currently 1% of released amounts) directed to a designated
                treasury wallet as enforced by the smart contract.
              </li>
              <li>
                <strong>USDC:</strong> USD Coin, a stablecoin on Solana; issuer terms apply.
              </li>
              <li>
                <strong>Solana Network:</strong> The public blockchain on which escrow and settlements execute.
              </li>
            </ul>
          </Section>

          <Section id="account" n={3} title="Account & Authentication">
            <p>
              Accounts and embedded wallets may be provided through Privy or similar authentication providers. You are
              responsible for safeguarding credentials, devices, and recovery flows. You may not share accounts, sell
              access, or circumvent authentication.
            </p>
            <p>
              Wallet addresses and on-chain activity are public. You consent to linking your authenticated identity with
              on-chain addresses used with the Service where required for compliance or dispute resolution.
            </p>
          </Section>

          <Section id="service" n={4} title="Service Description">
            <p>
              PivLinks facilitates USDC escrow on Solana for freelance and B2B-style invoices. The typical lifecycle is:
              (1) Freelancer creates an invoice and initializes an on-chain vault; (2) Client funds the vault (including
              card-based flows where available); (3) funds remain in escrow until release or dispute resolution; (4) upon
              valid release, the smart contract transfers proceeds per program rules (e.g., 99% to Freelancer, 1%
              Treasury Fee).
            </p>
            <p>
              <strong>On-chain enforcement:</strong> Final settlement is determined by the deployed program and Solana
              network consensus, not by PivLinks&apos; subjective discretion. PivLinks provides orchestration, UI, and
              off-chain records; it is not a bank, money transmitter, or custodian of fiat.
            </p>
          </Section>

          <Section id="roles" n={5} title="Roles & Responsibilities">
            <p>
              <strong>Freelancers</strong> must accurately describe work, deliver in good faith, protect the Release
              Password distribution channel, and comply with law. You are solely responsible for client relationships and
              deliverable quality.
            </p>
            <p>
              <strong>Clients</strong> must verify work before authorizing release, protect the Release Password from
              unauthorized use, and ensure payment sources are lawful. Authorizing release is a strong signal that
              obligations are satisfied; misuse may limit dispute outcomes.
            </p>
          </Section>

          <Section id="fees" n={6} title="Fees & Payments">
            <p>
              Treasury Fee, network fees (priority fees), and any card or payment-processor fees may apply. Fees may
              change with notice; continued use after the effective date constitutes acceptance unless prohibited by law.
            </p>
            <p>
              Amounts may be quoted in fiat for UX; settlement occurs in USDC on Solana. FX and rounding differences are
              possible; you accept the risk of variance between displayed fiat and on-chain USDC.
            </p>
          </Section>

          <Section id="release" n={7} title="Release Password & Funds Movement">
            <p>
              The Release Password is hashed (e.g., bcrypt) for storage; plaintext is not retained by PivLinks. Successful
              release flows result in on-chain transfers that are generally irreversible. PivLinks cannot &quot;undo&quot; a
              confirmed blockchain transaction.
            </p>
            <p>
              In V1, certain signing steps may use an operational hot wallet as described in our documentation; you
              acknowledge this architecture and associated operational risks.
            </p>
          </Section>

          <Section id="disputes" n={8} title="Disputes (Transaction Disputes)">
            <p>
              If parties disagree on release, they should open a support ticket and may escalate to a formal invoice
              dispute where available. You agree to cooperate, provide evidence, and respond within reasonable deadlines.
            </p>
            <p>
              PivLinks may offer a <strong>14-day</strong> dispute window or similar policy from funding or delivery
              milestones (as stated in-product). Outcomes may include release to Freelancer, refund or partial refund
              flows where technically and legally feasible, or dismissal. PivLinks&apos; decisions are binding on use of
              the Service but do not replace judicial remedies where available.
            </p>
            <p>
              Nothing in this section limits your right to pursue claims in arbitration or courts as set forth in Section
              20.
            </p>
          </Section>

          <Section id="refunds" n={9} title="Refunds">
            <p>
              Because funds are held in non-custodial on-chain escrow, refunds are not guaranteed and typically require
              mutual agreement, successful dispute resolution, or technical feasibility (e.g., before irreversible
              release). Chargebacks or card network disputes may be handled per processor rules and may affect access to the
              Service.
            </p>
          </Section>

          <Section id="acceptable-use" n={10} title="Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for illegal goods, services, gambling where prohibited, or fraud.</li>
              <li>Violate sanctions, AML, or CTF laws; launder proceeds; or conceal beneficial owners.</li>
              <li>Harass, threaten, or harm others; upload malware; or attack the Service or Solana.</li>
              <li>Scrape, reverse engineer, or probe smart contracts or APIs beyond permitted use.</li>
              <li>Mislead counterparties, manipulate invoices, or abuse dispute processes.</li>
            </ul>
          </Section>

          <Section id="crypto-risks" n={11} title="Crypto & Blockchain Risk Disclosures">
            <ul>
              <li>Digital assets can be volatile; USDC may de-peg or face issuer or regulatory actions.</li>
              <li>Smart contracts may contain bugs; upgrades or forks may affect behavior.</li>
              <li>Networks may congest, reorder, or halt transactions; fees may spike.</li>
              <li>On-chain data is public; privacy is limited for addresses and amounts.</li>
              <li>
                Escrow is not FDIC or SIPC insured. You may lose value due to operational errors, key loss, or regulatory
                change.
              </li>
            </ul>
          </Section>

          <Section id="ip" n={12} title="Intellectual Property">
            <p>
              PivLinks name, logos, UI, and documentation are owned by PivLinks or licensors. Subject to these Terms, PivLinks
              grants you a limited, non-exclusive, non-transferable license to access the Service. You grant PivLinks a
              worldwide license to host, process, and display content you submit solely to operate and improve the Service
              and comply with law.
            </p>
          </Section>

          <Section id="third-party" n={13} title="Third-Party Services">
            <p>
              The Service integrates Privy (auth, wallets, payments), Supabase (database), Vercel (hosting), Solana RPC
              providers, and Circle/USDC. Your use is also subject to their terms. PivLinks is not responsible for
              third-party failures.
            </p>
          </Section>

          <Section id="kyc" n={14} title="KYC / AML / Sanctions">
            <p>
              PivLinks may require identity verification, enhanced due diligence, or geofencing. We may delay, freeze, or
              terminate transactions that appear suspicious, sanctioned, or non-compliant, and may file reports where
              required by law.
            </p>
          </Section>

          <Section id="tax" n={15} title="Tax">
            <p>
              You are responsible for taxes, withholding, and reporting in your jurisdictions. PivLinks does not provide
              tax advice. Informational summaries in the app are not tax or legal advice.
            </p>
          </Section>

          <Section id="termination" n={16} title="Termination">
            <p>
              You may stop using the Service at any time. PivLinks may suspend or terminate access for breach, risk, legal
              process, or operational reasons. Provisions that by nature should survive (fees owed, liability limits,
              indemnity, dispute resolution) survive termination.
            </p>
          </Section>

          <Section id="disclaimers" n={17} title="Disclaimers">
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. PIVLINK DOES NOT WARRANT UNINTERRUPTED OR ERROR-FREE OPERATION OR THAT DEFECTS WILL BE
              CORRECTED.
            </p>
            <p>V1 may be considered beta or evolving; features and risk controls may change.</p>
          </Section>

          <Section id="liability" n={18} title="Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PIVLINK AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND
              AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
              DAMAGES, OR LOST PROFITS, DATA, OR GOODWILL.
            </p>
            <p>
              PivLinks&apos; aggregate liability for any claim arising out of these Terms or the Service will not exceed
              the greater of (a) the total fees paid by you to PivLinks for the Service in the twelve (12) months before the
              claim or (b) one hundred U.S. dollars (USD $100).
            </p>
            <p>Some jurisdictions do not allow certain limitations; in those cases, limits apply to the fullest extent.</p>
          </Section>

          <Section id="indemnity" n={19} title="Indemnification">
            <p>
              You will defend, indemnify, and hold harmless PivLinks and its affiliates from claims, damages, losses, and
              expenses (including reasonable attorneys&apos; fees) arising from your use of the Service, your content,
              your violation of these Terms, or your violation of third-party rights or law.
            </p>
          </Section>

          <Section id="governing" n={20} title="Governing Law & Dispute Resolution">
            <p>
              <strong>Governing law (placeholder):</strong> These Terms are governed by the laws of [Delaware, USA],
              excluding conflict-of-law rules, unless mandatory consumer protections require otherwise.
            </p>
            <p>
              <strong>Informal resolution:</strong> Before filing a claim, you agree to contact{' '}
              <a href="mailto:legal@pivlinks.example.com" className="text-blue-600 hover:underline">
                legal@pivlinks.example.com
              </a>{' '}
              and attempt good-faith resolution for 30 days.
            </p>
            <p>
              <strong>Arbitration (placeholder):</strong> Except for small claims or injunctive relief for IP or misuse,
              disputes will be resolved by binding arbitration under [AAA/ICC rules] in [city, state], on an individual
              basis. <strong>Class actions and class arbitrations are waived</strong> to the extent permitted by law.
            </p>
            <p>
              <strong>EU/UK consumers:</strong> Nothing in this section limits mandatory rights under applicable consumer
              law where you qualify as a consumer.
            </p>
          </Section>

          <Section id="force-majeure" n={21} title="Force Majeure">
            <p>
              PivLinks is not liable for delays or failures due to events beyond reasonable control, including natural
              disasters, war, terrorism, labor disputes, internet or blockchain outages, regulatory actions, or failures
              of third-party infrastructure.
            </p>
          </Section>

          <Section id="changes" n={22} title="Changes to Terms">
            <p>
              We may modify these Terms by posting updates and updating the &quot;Last updated&quot; date. Material changes
              may require additional notice (e.g., email or in-app). Continued use after the effective date constitutes
              acceptance. If you disagree, stop using the Service.
            </p>
          </Section>

          <Section id="misc" n={23} title="Miscellaneous (Severability, Entire Agreement, Assignment)">
            <p>
              If any provision is invalid, the remainder remains in effect. These Terms and the Privacy Policy are the
              entire agreement regarding the Service. You may not assign these Terms without consent; PivLinks may assign
              in connection with a merger, acquisition, or asset sale.
            </p>
          </Section>

          <Section id="contact" n={24} title="Contact">
            <p>
              Questions about these Terms:{' '}
              <a href="mailto:legal@pivlinks.example.com" className="text-blue-600 hover:underline">
                legal@pivlinks.example.com
              </a>
              . General inquiries:{' '}
              <Link href="/contact" className="text-blue-600 hover:underline">
                Contact page
              </Link>
              .
            </p>
          </Section>
        </div>
      </div>

      <section className="bg-slate-950 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400 mb-2">Related</p>
            <p className="text-2xl font-bold">Privacy & security</p>
            <p className="text-slate-400 text-sm mt-2">How we handle data and protect the platform.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/privacy" className="btn-primary inline-flex items-center justify-center text-sm">
              Privacy Policy
            </Link>
            <Link href="/security" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Data Security
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
