'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export function PrintButton({ label = 'Print / Save as PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center space-x-2 px-4 py-2 rounded bg-imperial-800 border border-gold-500/30 text-xs font-mono text-gold-300 hover:bg-imperial-700 print:hidden"
    >
      <Printer className="w-3.5 h-3.5" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
