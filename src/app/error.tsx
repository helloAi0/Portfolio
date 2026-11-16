'use client';

import Link from 'next/link';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-serif font-bold text-white mb-2">Something went wrong</h1>
      <p className="text-sm text-neutral-300 mb-6">This page could not be loaded. You can try again or go back to the home page.</p>
      <div className="flex justify-center gap-3">
        <button type="button" onClick={reset} className="px-4 py-2 rounded border border-gold-500/40 text-xs font-mono text-gold-300 hover:bg-imperial-800">
          Try again
        </button>
        <Link href="/" className="px-4 py-2 rounded border border-white/10 text-xs font-mono text-neutral-300 hover:bg-imperial-800">
          Home
        </Link>
      </div>
    </div>
  );
}
