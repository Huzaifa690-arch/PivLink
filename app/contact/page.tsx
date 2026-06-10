'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/components/Toast';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production: POST to a backend mailer or use a service like Resend
    setSubmitted(true);
    toast('Message received! We\'ll get back to you soon.', 'success');
  };

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <section className="relative flex-1 py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to home
            </Link>

            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Get in touch</p>
            <h1 className="text-4xl md:text-5xl font-bold text-text mb-4">Contact us</h1>
            <p className="text-lg text-gray-500 mb-10">
              Have questions about PivLinks or need support? Send us a message and we&apos;ll get back to you.
            </p>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl border border-gray-100 p-10 shadow-sm text-center"
              >
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-text mb-2">Message received!</h2>
                <p className="text-gray-500 text-sm mb-2">
                  We don&apos;t have a backend mailer configured yet. For now, email us directly at{' '}
                  <a href="mailto:support@pivlinks.example.com" className="text-primary underline">
                    support@pivlinks.example.com
                  </a>
                </p>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', message: '' }); }}
                  className="mt-4 text-sm text-gray-400 hover:text-primary transition-colors"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="input-field"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className="input-field"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                    className="input-field resize-y"
                    placeholder="How can we help you?"
                  />
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button type="submit" className="btn-primary">
                    Send message
                  </button>
                  <Link href="/" className="btn-outline">
                    Back to Home
                  </Link>
                </div>
              </form>
            )}

            <div className="mt-10 pt-8 border-t border-gray-100">
              <p className="text-sm text-gray-400 mb-1">Prefer email?</p>
              <a href="mailto:support@pivlinks.example.com" className="text-primary font-semibold hover:underline">
                support@pivlinks.example.com
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">© {new Date().getFullYear()} PivLinks</span>
          <div className="flex gap-6">
            <Link href="/about" className="text-gray-400 hover:text-primary text-sm font-medium transition-colors">About</Link>
            <Link href="/create" className="text-gray-400 hover:text-primary text-sm font-medium transition-colors">Create Invoice</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
