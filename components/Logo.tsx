'use client';

import React from 'react';
import Link from 'next/link';
import { BridgeMark, LetterMark } from '@/lib/logo-marks';

export type LogoVariant = 'bridge' | 'letter';
export type LogoSize = 'sm' | 'md' | 'lg';

const iconShell: Record<LogoSize, string> = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-2xl',
  lg: 'w-12 h-12 rounded-3xl',
};

const iconSvg: Record<LogoSize, string> = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
};

const wordmarkDefault: Record<LogoSize, string> = {
  sm: 'text-xl font-extrabold tracking-tight',
  md: 'text-xl font-extrabold tracking-tight',
  lg: 'text-2xl font-extrabold tracking-tight',
};

export type LogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
  showWordmark?: boolean;
  href?: string;
  className?: string;
  wordmarkClassName?: string;
  /** Light wordmark on dark backgrounds (e.g. footer) */
  dark?: boolean;
  /** Icon only on primary shell; omit shell when true */
  iconOnly?: boolean;
  /** Monochrome mark without blue shell (footer compact) */
  mono?: boolean;
};

function LogoMark({
  variant,
  className,
}: {
  variant: LogoVariant;
  className?: string;
}) {
  const Mark = variant === 'letter' ? LetterMark : BridgeMark;
  return <Mark className={className} />;
}

export function Logo({
  variant = 'bridge',
  size = 'sm',
  showWordmark = true,
  href,
  className = '',
  wordmarkClassName,
  dark = false,
  iconOnly = false,
  mono = false,
}: LogoProps) {
  const wordmark =
    wordmarkClassName ??
    (dark ? 'text-lg font-bold tracking-tight' : wordmarkDefault[size]);

  const content = (
    <>
      {mono ? (
        <LogoMark variant={variant} className={`${iconSvg[size]} text-primary shrink-0`} />
      ) : (
        <div
          className={`${iconShell[size]} bg-primary border border-primary/70 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-sm shadow-primary/20`}
        >
          <LogoMark variant={variant} className={iconSvg[size]} />
        </div>
      )}
      {showWordmark && !iconOnly && (
        <span className={wordmark}>
          <span className={dark ? 'text-blue-300' : 'text-primary'}>Piv</span>
          <span className={dark ? 'text-white' : 'text-slate-950'}>Links</span>
        </span>
      )}
    </>
  );

  const rootClass = `flex items-center gap-2 group ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={rootClass} aria-label="PivLinks home">
        {content}
      </Link>
    );
  }

  return <div className={rootClass}>{content}</div>;
}
