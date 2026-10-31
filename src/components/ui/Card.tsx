import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'marble' | 'subtle' | 'gold-border';
  className?: string;
}

export function Card({ children, variant = 'marble', className = '', ...props }: CardProps) {
  const variants = {
    marble: 'marble-card rounded-md p-6 relative overflow-hidden transition-all duration-300',
    subtle: 'bg-imperial-900/60 border border-white/5 rounded-md p-6 backdrop-blur-sm',
    'gold-border': 'bg-imperial-900/90 border border-gold-500/40 rounded-md p-6 shadow-imperial-gold',
  };

  return (
    <div className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}

