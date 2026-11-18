import type { ReactNode } from 'react';

interface AuthBackgroundProps {
  children: ReactNode;
}

export function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      <div
        className="auth-animated-gradient pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-800 to-green-600"
        aria-hidden="true"
      />

      <div
        className="auth-ambient-light pointer-events-none absolute left-[12%] top-[18%] h-72 w-72 rounded-full bg-green-300/20 blur-3xl"
        aria-hidden="true"
      />

      <svg
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          className="auth-wave-a opacity-5"
          d="M-120 620C150 470 330 760 620 610C900 465 1060 670 1320 520V900H-120Z"
          fill="white"
        />
        <path
          className="auth-wave-b opacity-25"
          d="M-120 280C170 140 360 420 610 300C860 180 1060 370 1320 240V900H-120Z"
          fill="white"
        />

        <g
          className="auth-field-group"
          transform="rotate(-18 600 400)"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="180" y="120" width="840" height="560" rx="8" pathLength={1} className="auth-field-line" />
          <path d="M600 120V680" pathLength={1} className="auth-field-line" />
          <circle cx="600" cy="400" r="82" pathLength={1} className="auth-field-line" />
          <rect x="180" y="240" width="126" height="320" pathLength={1} className="auth-field-line" />
          <rect x="894" y="240" width="126" height="320" pathLength={1} className="auth-field-line" />
          <rect x="180" y="330" width="54" height="140" pathLength={1} className="auth-field-line" />
          <rect x="966" y="330" width="54" height="140" pathLength={1} className="auth-field-line" />
          <circle cx="600" cy="400" r="4" fill="white" stroke="none" className="auth-field-line" pathLength={1} />
        </g>
      </svg>

      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export default AuthBackground;
