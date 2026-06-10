'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const perks = [
  { title: 'Speed', desc: 'Settlements in ~400ms. No waiting for bank transfers or payout queues.', icon: '⚡' },
  { title: 'Cost', desc: 'Lower fees than traditional platforms. Keep more of what you earn.', icon: '💰' },
  { title: 'Access', desc: 'No US entity or complex KYC required. Connect a wallet and go.', icon: '🌍' },
  { title: 'Security', desc: 'Escrow on Solana. Only the release password can move funds to you.', icon: '🔒' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-slate-100 py-24 px-6">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%)]" />
        <div className="relative max-w-6xl mx-auto">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.35em] text-blue-600 font-semibold mb-5">
                Our Story
              </p>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 mb-6">
                Built for forward-thinking businesses and remote teams.
              </h1>
              <p className="text-lg leading-8 text-slate-600 mb-8">
                PivLinks was created to simplify global payroll and payments with the transparency of blockchain, the speed of Solana, and the trust of authenticated wallets.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/create" className="btn-primary inline-flex items-center justify-center">
                  Start a Payment
                </Link>
                <Link href="/wallet" className="btn-outline inline-flex items-center justify-center">
                  View Wallet
                </Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400 mb-4">What we deliver</p>
              <h2 className="text-3xl font-semibold text-slate-950 mb-5">A secure, compliant, and user-friendly payment experience.</h2>
              <div className="space-y-5 text-slate-600">
                <div>
                  <p className="font-semibold text-slate-900">Trusted invoice workflows</p>
                  <p className="text-sm">Create, fund, and release payments from a single dashboard.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Global wallet access</p>
                  <p className="text-sm">Clients can pay without needing a wallet, while freelancers can receive funds in Solana.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Transparent escrow</p>
                  <p className="text-sm">Auditable on-chain escrow records for every invoice.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-600 mb-3">How it works</p>
            <h2 className="text-4xl font-bold text-slate-950">A straightforward invoice lifecycle for global teams</h2>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {[
            { title: 'Create invoice', description: 'Generate a secure invoice, set amount and terms, then share a release password with your client.' },
            { title: 'Client payment', description: 'Clients pay via a simple checkout flow, and funds are held in escrow until work is verified.' },
            { title: 'Delivery confirmation', description: 'Verify delivery, confirm the work, and keep all history in one place.' },
            { title: 'Release funds', description: 'Release payments instantly to the freelancer’s wallet with one secure action.' },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400 mb-3">{item.title}</p>
              <p className="text-gray-600 leading-7">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 text-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid gap-8 lg:grid-cols-4">
            {perks.map((perk) => (
              <div key={perk.title} className="rounded-3xl border border-white/10 bg-white/5 p-8">
                <div className="text-3xl mb-4">{perk.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{perk.title}</h3>
                <p className="text-slate-300 text-sm leading-6">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-600 mb-3">Trusted by teams</p>
          <h2 className="text-4xl font-bold text-slate-950">Built for real businesses and freelancers</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { quote: 'PivLinks removed the friction from our global payment process. We can now manage invoices and release funds with confidence.', name: 'Amelia R.', role: 'Freelance Designer' },
            { quote: 'The approval workflow and escrow model give us the control we need while keeping payments fast and transparent.', name: 'Noah S.', role: 'Operations Lead' },
            { quote: 'Every invoice is easier to track, and clients love the secure release flow.', name: 'Priya M.', role: 'Global Payments Manager' },
          ].map((item) => (
            <div key={item.name} className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
              <p className="text-slate-600 leading-relaxed mb-6">“{item.quote}”</p>
              <p className="font-semibold text-slate-950">{item.name}</p>
              <p className="text-sm text-slate-500">{item.role}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
