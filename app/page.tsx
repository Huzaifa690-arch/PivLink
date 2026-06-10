'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaAddress } from '@/lib/privy';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

function HomeWithPrivy() {
  const { authenticated, ready, login, logout } = usePrivy();
  const solanaAddress = useSolanaAddress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-100 to-white">
      <Navbar />

      <main className="relative overflow-hidden">
        <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_40%)]" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.35em] text-blue-600 font-semibold mb-6">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">🚀</span>
                  Global Payroll & Escrow
                </p>
                <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-950 mb-6">
                  Instant invoice payments for remote teams and freelancers.
                </h1>
                <p className="text-lg leading-8 text-slate-600 mb-8">
                  PivLinks combines Privy authentication, Solana escrow, and real-time on-chain settlements so your global workforce gets paid faster, safer, and with simple self-service workflows.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/create" className="btn-primary inline-flex items-center justify-center">
                    Create Invoice
                  </Link>
                  <Link href="/wallet" className="btn-outline inline-flex items-center justify-center">
                    View Wallet
                  </Link>
                </div>

                <div className="mt-12 grid gap-4 sm:grid-cols-3">
                  {[
                    { label: '400ms settle', value: 'Under 1 sec' },
                    { label: 'Global coverage', value: '100+ countries' },
                    { label: 'Secure escrow', value: 'Solana + Privy' },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-sm text-slate-500">{metric.label}</p>
                      <p className="text-xl font-semibold text-slate-950 mt-2">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-700 text-xl">💼</div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Trusted workflow</p>
                    <p className="text-lg font-semibold text-slate-950">Professional invoice lifecycle</p>
                  </div>
                </div>
                <div className="space-y-5 text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">Secure release controls</p>
                    <p className="text-sm">Only authorized clients can release funds with a release password.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Embedded wallet access</p>
                    <p className="text-sm">Quickly onboard your payees with Privy-authenticated wallets.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Real-time invoice tracking</p>
                    <p className="text-sm">See client payments, escrow status, and release history in one place.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 text-white py-20">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400 mb-3">Built for remote teams</p>
                <h2 className="text-4xl font-bold tracking-tight mb-6">Modern escrow payments that look and feel enterprise-ready.</h2>
                <p className="text-slate-300 leading-8 mb-8">
                  PivLinks gives finance and operations teams the tools to launch fast invoice workflows without complex banking integrations. Your clients can pay in USDC, your freelancers get paid on Solana, and every transaction is protected with escrow logic.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { title: 'Escrow controls', detail: 'Release only after delivery.' },
                    { title: 'Compliance-ready', detail: 'On-chain audit trail & immutable records.' },
                    { title: 'Card-enabled client flow', detail: 'Pay from anywhere, no wallet required.' },
                    { title: 'Fast settlement', detail: 'Instant receipts and payout confirmation.' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm text-slate-300 uppercase tracking-[0.2em] mb-3">{item.title}</p>
                      <p className="text-base leading-7 text-slate-100">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-5">
                {[
                  'Clear invoicing for clients and freelancers',
                  'Smart contract escrow for secure payments',
                  'Privy-powered wallet onboarding and verification',
                ].map((line) => (
                  <div key={line} className="rounded-3xl bg-slate-900/80 border border-white/5 p-6">
                    <p className="text-lg font-semibold text-white mb-2">{line}</p>
                    <p className="text-sm text-slate-400">A polished, trust-first experience at every step.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 lg:px-8">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-600 mb-4">Customer Stories</p>
            <h2 className="text-4xl font-bold text-slate-950 mb-6">Trusted by fast-moving teams</h2>
            <div className="grid gap-6 lg:grid-cols-3">
              {[
                {
                  quote: 'PivLinks removed the friction from our global payment process. We can now manage invoices and release funds with confidence.',
                  name: 'Amelia R.',
                  role: 'Freelance Designer',
                },
                {
                  quote: 'The approval workflow and escrow model give us the control we need while keeping payments fast and transparent.',
                  name: 'Noah S.',
                  role: 'Operations Lead',
                },
                {
                  quote: 'Every invoice is easier to track, and clients love the secure release flow.',
                  name: 'Priya M.',
                  role: 'Global Payments Manager',
                },
              ].map((item) => (
                <div key={item.name} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-left">
                  <p className="text-slate-600 leading-relaxed mb-6">“{item.quote}”</p>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
            <p className="font-semibold text-amber-800">Privy not configured</p>
            <p className="text-sm text-amber-700">Add NEXT_PUBLIC_PRIVY_APP_ID to app/.env.local and restart the dev server.</p>
          </div>
          <h1 className="text-3xl font-bold mb-3">PivLinks</h1>
          <p className="mb-4">Your app is ready. Configure Privy to use auth and wallet features.</p>
          <a className="text-blue-600 underline" href="https://dashboard.privy.io/" target="_blank" rel="noreferrer">Get Privy App ID</a>
        </div>
      </main>
    );
  }

  return <HomeWithPrivy />;
}
