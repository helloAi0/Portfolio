import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'bronze' | 'verified' | 'detected' | 'neutral' | 'danger';
  size?: 'xs' | 'sm';
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({ children, variant = 'gold', size = 'sm', icon, className = '' }: BadgeProps) {
  const base = 'inline-flex items-center font-mono rounded uppercase tracking-wider font-medium';

  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5 space-x-1',
    sm: 'text-[11px] px-2.5 py-1 space-x-1.5',
  };

  const variants = {
    gold: 'bg-gold-500/10 text-gold-300 border border-gold-500/30',
    bronze: 'bg-bronze-500/10 text-bronze-300 border border-bronze-500/30',
    verified: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
    detected: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
    neutral: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
    danger: 'bg-red-500/10 text-red-300 border border-red-500/30',
  };

  return (
    <span className={`${base} ${sizeStyles[size]} ${variants[variant]} ${className}`}>
      {icon && <span className="opacity-80">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
