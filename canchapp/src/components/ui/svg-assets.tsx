import React from 'react';

export function FieldPitchSVG({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 160 100"
      width="160"
      height="100"
      className={className}
      style={{ imageRendering: 'pixelated', opacity: 0.7 }}
      {...props}
    >
      <rect x="4" y="4" width="152" height="92" rx="6" fill="none" stroke="#fff" strokeWidth="2" />
      <rect x="4" y="30" width="24" height="40" rx="2" fill="none" stroke="#fff" strokeWidth="1.5" />
      <rect x="132" y="30" width="24" height="40" rx="2" fill="none" stroke="#fff" strokeWidth="1.5" />
      <line x1="80" y1="4" x2="80" y2="96" stroke="#fff" strokeWidth="1.5" />
      <circle cx="80" cy="50" r="16" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="80" cy="50" r="2" fill="#fff" />
      <rect x="4" y="38" width="12" height="24" rx="1" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1" />
      <rect x="144" y="38" width="12" height="24" rx="1" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1" />
    </svg>
  );
}

export function BasketballCourtSVG({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 160 100"
      width="160"
      height="100"
      className={className}
      style={{ imageRendering: 'pixelated', opacity: 0.65 }}
      {...props}
    >
      <rect x="4" y="4" width="152" height="92" rx="4" fill="none" stroke="#fff" strokeWidth="2" />
      <line x1="80" y1="4" x2="80" y2="96" stroke="#fff" strokeWidth="1.5" />
      <circle cx="80" cy="50" r="10" fill="none" stroke="#fff" strokeWidth="1.5" />
      <rect x="4" y="26" width="36" height="48" rx="2" fill="none" stroke="#fff" strokeWidth="1.5" />
      <rect x="120" y="26" width="36" height="48" rx="2" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="22" cy="50" r="8" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1" />
      <circle cx="138" cy="50" r="8" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1" />
    </svg>
  );
}

export function PadelCourtSVG({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 160 100"
      width="160"
      height="100"
      className={className}
      style={{ imageRendering: 'pixelated', opacity: 0.65 }}
      {...props}
    >
      <rect x="8" y="8" width="144" height="84" rx="4" fill="none" stroke="#fff" strokeWidth="2" />
      <line x1="80" y1="8" x2="80" y2="92" stroke="#fff" strokeWidth="2" />
      <line x1="8" y1="50" x2="152" y2="50" stroke="#fff" strokeWidth="1.5" />
      <rect x="8" y="26" width="144" height="24" rx="0" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1" />
      <rect x="8" y="50" width="144" height="24" rx="0" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1" />
      <circle cx="40" cy="50" r="3" fill="#fff" />
      <circle cx="120" cy="50" r="3" fill="#fff" />
    </svg>
  );
}

export function MiniFieldSVG({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 80 50"
      width="80"
      height="50"
      className={className}
      style={{ imageRendering: 'pixelated' }}
      {...props}
    >
      <rect x="2" y="2" width="76" height="46" rx="4" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" />
      <line x1="40" y1="2" x2="40" y2="48" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" />
      <circle cx="40" cy="25" r="8" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" />
      <circle cx="40" cy="25" r="1.5" fill="rgba(255,255,255,.3)" />
      <rect x="2" y="17" width="12" height="16" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
      <rect x="66" y="17" width="12" height="16" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
    </svg>
  );
}
