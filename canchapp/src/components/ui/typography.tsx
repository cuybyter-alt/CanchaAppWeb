import React from 'react';

interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'body' | 'small' | 'pixel-sm' | 'pixel';
  color?: 'primary' | 'text' | 'text-2' | 'text-3' | 'muted' | 'white' | 'accent';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p' | 'span' | 'div';
  className?: string;
  children: React.ReactNode;
}

export function Typography({
  variant = 'body',
  color = 'text',
  as,
  className = '',
  children,
}: TypographyProps) {
  // Map variant to appropriate HTML element if not explicitly provided
  const defaultElement = {
    h1: 'h1' as const,
    h2: 'h2' as const,
    h3: 'h3' as const,
    h4: 'h4' as const,
    h5: 'h5' as const,
    body: 'p' as const,
    small: 'span' as const,
    'pixel-sm': 'span' as const,
    pixel: 'span' as const,
  };

  const Component = as || defaultElement[variant];

  // Map variant to Tailwind classes
  const variantClasses = {
    h1: 'text-4xl md:text-5xl font-black font-[var(--font-display)] tracking-tight',
    h2: 'text-3xl md:text-4xl font-black font-[var(--font-display)] tracking-tight',
    h3: 'text-2xl md:text-3xl font-extrabold font-[var(--font-display)]',
    h5: 'text-lg md:text-xl font-extrabold font-[var(--font-display)]',
    h4: 'text-xl md:text-2xl font-extrabold font-[var(--font-display)]',
    body: 'text-base font-semibold',
    small: 'text-sm font-semibold',
    'pixel-sm': 'text-[10px] font-bold font-[var(--font-pixel)] tracking-wider uppercase',
    pixel: 'text-xs font-bold font-[var(--font-pixel)] tracking-wider uppercase',
  };

  // Map color to CSS variables
  const colorClasses = {
    primary: 'text-[var(--color-primary)]',
    text: 'text-[var(--color-text)]',
    'text-2': 'text-[var(--color-text-2)]',
    'text-3': 'text-[var(--color-text-3)]',
    muted: 'text-[var(--color-muted)]',
    white: 'text-white',
    accent: 'text-[var(--color-accent)]',
  };

  return (
    <Component className={`${variantClasses[variant]} ${colorClasses[color]} ${className}`}>
      {children}
    </Component>
  );
}
