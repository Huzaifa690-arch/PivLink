'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    StripeOnramp?: {
      init: (opts: { clientSecret: string }) => Promise<{
        mount: (target: string | HTMLElement) => void;
        addEventListener: (event: string, listener: () => void) => void;
      }>;
    };
  }
}

const ONRAMP_SCRIPT_SRC = 'https://js.stripe.com/v3/crypto/onramp.js';

function loadOnrampScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.StripeOnramp) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${ONRAMP_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Stripe on-ramp script')));
      return;
    }

    const script = document.createElement('script');
    script.src = ONRAMP_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Stripe on-ramp script'));
    document.body.appendChild(script);
  });
}

interface StripeOnrampWidgetProps {
  clientSecret: string;
  onSessionUpdated?: () => void;
}

export function StripeOnrampWidget({ clientSecret, onSessionUpdated }: StripeOnrampWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const mountWidget = async () => {
      try {
        await loadOnrampScript();
        if (!mounted || !containerRef.current || !window.StripeOnramp) return;

        const onramp = await window.StripeOnramp.init({ clientSecret });
        onramp.mount(containerRef.current);
        onramp.addEventListener('onramp_session_updated', () => {
          onSessionUpdated?.();
        });
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load Stripe on-ramp widget');
        }
      }
    };

    mountWidget();
    return () => {
      mounted = false;
    };
  }, [clientSecret, onSessionUpdated]);

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return <div ref={containerRef} className="min-h-[420px] w-full rounded-2xl overflow-hidden" />;
}
