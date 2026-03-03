import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'accent' | 'score' | 'muted';
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = 'primary', className = '', children }: BadgeProps) {
  const variantClasses = {
    primary: 'bg-[var(--color-primary)] text-white',
    accent: 'bg-[var(--color-accent)] text-white',
    score: 'bg-[var(--color-score)] text-[var(--color-text)]',
    muted: 'bg-[var(--color-muted)] text-[var(--color-text)]',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[var(--radius-badge)] text-[10px] font-extrabold font-[var(--font-display)] tracking-wide uppercase ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
