import React from 'react';

/** Shown where a section has no published records yet, so a page never looks broken or blank. */
export function EmptyNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="marble-card rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto">
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400">Coming soon</p>
        <h2 className="font-serif font-black text-white text-3xl mt-3">{title}</h2>
        <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
