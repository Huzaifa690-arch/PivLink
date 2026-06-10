'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaAddress } from '@/lib/privy';
import { useToast } from '@/components/Toast';
import type { KycIdType, UserKyc } from '@/lib/supabase/types';

const ID_TYPES: { value: KycIdType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'national_id', label: 'National ID' },
];

const COUNTRIES = [
  ['US', 'United States'],
  ['CA', 'Canada'],
  ['GB', 'United Kingdom'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['NL', 'Netherlands'],
  ['SE', 'Sweden'],
  ['NO', 'Norway'],
  ['CH', 'Switzerland'],
  ['IE', 'Ireland'],
  ['PT', 'Portugal'],
  ['PL', 'Poland'],
  ['AE', 'United Arab Emirates'],
  ['SA', 'Saudi Arabia'],
  ['PK', 'Pakistan'],
  ['IN', 'India'],
  ['BD', 'Bangladesh'],
  ['SG', 'Singapore'],
  ['MY', 'Malaysia'],
  ['ID', 'Indonesia'],
  ['PH', 'Philippines'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['CN', 'China'],
  ['HK', 'Hong Kong'],
  ['AU', 'Australia'],
  ['NZ', 'New Zealand'],
  ['BR', 'Brazil'],
  ['MX', 'Mexico'],
  ['AR', 'Argentina'],
  ['CL', 'Chile'],
  ['ZA', 'South Africa'],
  ['NG', 'Nigeria'],
  ['EG', 'Egypt'],
  ['KE', 'Kenya'],
  ['TR', 'Turkey'],
];

function calcAgeYears(isoDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return -1;
  const dob = new Date(isoDate);
  if (Number.isNaN(dob.getTime())) return -1;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export default function KycOnboardingPage() {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const walletAddress = useSolanaAddress();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<UserKyc | null>(null);

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [idType, setIdType] = useState<KycIdType>('passport');
  const [idNumber, setIdNumber] = useState('');
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const headers: HeadersInit = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch('/api/kyc', { headers, cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json?.error || 'Failed to load KYC status');
        const kyc: UserKyc | null = json?.kyc ?? null;
        setExisting(kyc);
        if (kyc) {
          setFullName(kyc.full_name);
          setDateOfBirth(kyc.date_of_birth?.slice(0, 10) ?? '');
          setCountry(kyc.country);
          setIdType(kyc.id_type);
          setIdNumber(kyc.id_number);
        }
        if (!kyc || kyc.status === 'rejected') {
          setShowForm(true);
        }
      } catch (err: any) {
        if (!cancelled) toast(err?.message || 'Failed to load KYC status', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken, router, toast]);

  const age = calcAgeYears(dateOfBirth);
  const formValid =
    fullName.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
    age >= 18 &&
    country.trim().length === 2 &&
    ID_TYPES.some((t) => t.value === idType) &&
    idNumber.trim().length >= 3 &&
    agreed;

  const uploadDocumentIfNeeded = async (token: string | null, wallet: string): Promise<string | null> => {
    if (!idDocumentFile) return null;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/kyc/upload-url', {
      method: 'POST',
      headers,
      body: JSON.stringify({ walletAddress: wallet, filename: idDocumentFile.name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to prepare document upload');

    const uploadRes = await fetch(json.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': idDocumentFile.type || 'application/octet-stream' },
      body: idDocumentFile,
    });
    if (!uploadRes.ok) {
      throw new Error(`Failed to upload document (HTTP ${uploadRes.status})`);
    }
    return json.path as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      toast('Please complete all required fields', 'warning');
      return;
    }
    if (!walletAddress) {
      toast('No wallet detected. Please re-login to continue.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const documentPath = await uploadDocumentIfNeeded(token, walletAddress);

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          walletAddress,
          fullName: fullName.trim(),
          dateOfBirth,
          country: country.trim().toUpperCase(),
          idType,
          idNumber: idNumber.trim(),
          idDocumentPath: documentPath,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to submit KYC');
      setExisting(json.kyc);
      setShowForm(false);
      toast('Identity verification submitted', 'success');
      setTimeout(() => router.replace('/'), 600);
    } catch (err: any) {
      toast(err?.message || 'Failed to submit KYC', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
          Loading…
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-8 max-w-md text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950 mb-2">Sign in to continue</h1>
          <p className="text-slate-500 mb-6">You need to sign in before completing identity verification.</p>
          <button onClick={() => login()} className="btn-primary w-full">Sign in</button>
        </div>
      </main>
    );
  }

  const renderStatusBanner = () => {
    if (!existing) return null;
    const base = 'rounded-2xl border p-4 mb-6 text-sm flex items-start gap-3';
    if (existing.status === 'approved') {
      return (
        <div className={`${base} bg-emerald-50 border-emerald-200 text-emerald-800`}>
          <span className="text-lg leading-none">●</span>
          <div>
            <p className="font-semibold">Identity verified</p>
            <p className="text-emerald-700/80">You're all set. You can use PivLinks without restrictions.</p>
          </div>
        </div>
      );
    }
    if (existing.status === 'rejected') {
      return (
        <div className={`${base} bg-red-50 border-red-200 text-red-800`}>
          <span className="text-lg leading-none">●</span>
          <div>
            <p className="font-semibold">Verification rejected</p>
            <p className="text-red-700/80">
              {existing.rejection_reason || 'Please update your details below and resubmit.'}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className={`${base} bg-amber-50 border-amber-200 text-amber-800`}>
        <span className="text-lg leading-none">●</span>
        <div>
          <p className="font-semibold">Verification under review</p>
          <p className="text-amber-700/80">
            Your submission is being reviewed. You can continue using PivLinks in the meantime.
          </p>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Logo href="/" variant="bridge" size="md" className="mb-8" />

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-600 mb-2">Step 2 of 2</p>
          <h1 className="text-3xl font-bold text-slate-950 mb-2">Verify your identity</h1>
          <p className="text-slate-500 mb-6">
            We need a few details to keep PivLinks compliant and secure. Your information is stored privately.
          </p>

          {renderStatusBanner()}

          {existing && !showForm && existing.status !== 'rejected' && (
            <div className="space-y-3">
              <button
                onClick={() => router.replace('/')}
                className="btn-primary w-full"
              >
                Continue to PivLinks
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="w-full text-sm text-slate-500 hover:text-primary transition-colors py-2"
              >
                Update my details
              </button>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full legal name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="As shown on your ID"
                  className="input-field"
                  required
                  minLength={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="input-field"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                  />
                  {dateOfBirth && age >= 0 && age < 18 && (
                    <p className="text-xs text-red-500 mt-1">You must be at least 18 years old.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Country of residence</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Select country…</option>
                    {COUNTRIES.map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">ID type</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as KycIdType)}
                    className="input-field"
                    required
                  >
                    {ID_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">ID number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Document number"
                    className="input-field"
                    required
                    minLength={3}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  ID document <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setIdDocumentFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"
                />
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP, or PDF. Stored privately.</p>
              </div>

              <label className="flex items-start gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span>
                  I confirm the information above is accurate and I agree to PivLinks'{' '}
                  <Link href="/terms" className="text-primary hover:underline">Terms</Link> and{' '}
                  <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </span>
              </label>

              <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
                {existing && existing.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="md:w-auto px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!formValid || submitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Submit verification'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Wallet: {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}` : 'Connecting…'}
        </p>
      </div>
    </main>
  );
}
