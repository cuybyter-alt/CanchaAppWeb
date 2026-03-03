import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]',
    secondary: 'bg-white text-[var(--color-text)] hover:bg-[var(--color-surf2)] shadow-[var(--shadow-sm)]',
    accent: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-dark)] shadow-[var(--shadow-md)]',
    ghost: 'bg-transparent text-[var(--color-text-2)] hover:bg-[var(--color-surf2)] border-[1.5px] border-[var(--color-border)]',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 
        rounded-[var(--radius-full)] 
        font-[var(--font-body)] font-extrabold 
        transition-all duration-[var(--duration-mid)]
        hover:-translate-y-0.5 
        active:scale-95 active:translate-y-0
        border-none cursor-pointer
        ${variants[variant]} 
        ${sizes[size]} 
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
