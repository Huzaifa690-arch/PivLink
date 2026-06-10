import React from 'react';

/** White mark paths on transparent — 32×32 viewBox */
export function BridgeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M5.5 8.5C5.5 6.84 6.84 5.5 8.5 5.5H23.5C25.16 5.5 26.5 6.84 26.5 8.5V23.5C26.5 25.16 25.16 26.5 23.5 26.5H8.5C6.84 26.5 5.5 25.16 5.5 23.5V8.5Z"
        stroke="currentColor"
        strokeWidth="2.8"
      />
      <path d="M9.5 16H22.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M12.5 12.6L9.1 16L12.5 19.4" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 12.6L22.9 16L19.5 19.4" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.9" fill="currentColor" />
    </svg>
  );
}

/** Stylized P with link dot (second party) */
export function LetterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="7.75" y="6.75" width="5" height="18.5" rx="2.5" fill="currentColor" />
      <path
        fill="currentColor"
        d="M12.75 6.75H19.5C23.2 6.75 26.2 9.75 26.2 13.45C26.2 17.15 23.2 20.15 19.5 20.15H12.75V16.15H18.95C20.7 16.15 22.05 14.8 22.05 13.05C22.05 11.3 20.7 9.95 18.95 9.95H12.75V6.75Z"
      />
      <circle cx="27" cy="13.5" r="2.35" fill="currentColor" />
    </svg>
  );
}
