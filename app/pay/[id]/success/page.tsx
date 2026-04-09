'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getInvoice, checkFundingStatus } from '@/lib/api/invoices';
import type { Invoice } from '@/lib/supabase/types';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/components/Toast';

export default function PaymentSuccessPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const refreshInvoice = async () => {
      try {
        await checkFundingStatus(invoiceId);
      } catch {
        // Ignore transient funding verification failures.
      }
      await loadInvoice();
    };

    refreshInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoice(invoiceId);
      setInvoice(data);
    } catch {
      toast('Failed to load invoice details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center"
        >
          {/* Success icon */}
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-text mb-2">Payment submitted</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            {invoice
              ? `Your ${Number(invoice.amount_usdc).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC payment may take a few minutes to arrive and will be held securely in escrow.`
              : 'Your payment may take a few minutes to arrive and will be held securely in escrow.'}
          </p>

          {/* Next steps */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
            <h2 className="text-sm font-bold text-text mb-4 uppercase tracking-wider">What happens next</h2>
            <ol className="space-y-3">
              {[
                { n: 1, text: 'Wait for the freelancer to deliver their work' },
                { n: 2, text: 'Review and verify the work meets your expectations' },
                { n: 3, text: 'Use the release password to unlock and send funds' },
              ].map((s) => (
                <li key={s.n} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {s.n}
                  </span>
                  <span className="text-gray-600 text-sm">{s.text}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={`/release/${invoiceId}`}
              className="block w-full bg-primary text-white py-3.5 rounded-2xl font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all text-sm shadow-md shadow-primary/20"
            >
              Release Funds When Ready
            </Link>
            <Link
              href="/"
              className="block w-full border-2 border-gray-200 text-gray-700 py-3.5 rounded-2xl font-semibold hover:border-primary hover:text-primary transition-all text-sm"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
