import React from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: SectionHeadingProps) {
  return (
    <div className={`mb-12 ${centered ? 'text-center max-w-3xl mx-auto' : 'max-w-2xl'}`}>
      {eyebrow && (
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-[0.25em] text-gold-400 mb-2 justify-start">
          <span className="w-6 h-[1px] bg-gold-500/50" />
          <span>{eyebrow}</span>
          {centered && <span className="w-6 h-[1px] bg-gold-500/50" />}
        </div>
      )}
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-white mb-4">
        {title}
      </h2>
      {description && (
        <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-sans">
          {description}
        </p>
      )}
    </div>
  );
}
