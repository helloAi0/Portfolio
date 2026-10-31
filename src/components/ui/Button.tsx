import React from 'react';
import Link from 'next/link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  isExternal?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  isExternal,
  icon,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium tracking-wider uppercase transition-all duration-200 rounded-sm font-sans focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 space-x-1.5',
    md: 'text-xs px-5 py-2.5 space-x-2',
    lg: 'text-sm px-7 py-3.5 space-x-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-gold-500 via-gold-400 to-gold-600 text-imperial-950 font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-[0.98]',
    secondary:
      'bg-imperial-800 text-gold-300 border border-gold-500/30 hover:bg-imperial-700 hover:border-gold-500/60 hover:text-white',
    outline:
      'border border-gold-500/40 text-neutral-200 hover:text-gold-300 hover:border-gold-400 hover:bg-gold-500/10',
    ghost:
      'text-neutral-400 hover:text-gold-300 hover:bg-imperial-800/60',
  };

  const combinedClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  if (href) {
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={combinedClasses}
        >
          {icon && <span>{icon}</span>}
          <span>{children}</span>
        </a>
      );
    }
    return (
      <Link href={href} className={combinedClasses}>
        {icon && <span>{icon}</span>}
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <button className={combinedClasses} {...props}>
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
