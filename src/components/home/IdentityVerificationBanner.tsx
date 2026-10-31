import React from 'react';
import { resolveIdentitySafety } from '@/lib/identity';
import { ShieldAlert, AlertTriangle, UserCheck, Lock } from 'lucide-react';

export function IdentityVerificationBanner() {
  const identity = resolveIdentitySafety();

  if (identity.identityVerification.isOwnerConfirmed) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/40 via-imperial-900 to-amber-950/40 border-y border-amber-500/30 py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-mono font-bold text-amber-300 tracking-wider uppercase mr-2">
              Identity Verification Gate Active:
            </span>
            <span className="text-neutral-300">
              Display Name: <strong className="text-white">{identity.displayName}</strong> | Supplied Mailbox: <strong className="text-gold-300 font-mono">{identity.contactEmail}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono text-amber-200/80 bg-amber-950/60 px-3 py-1 rounded border border-amber-500/20">
          <Lock className="w-3 h-3 text-amber-400" />
          <span>Config Isolation Maintained Pending Owner Signoff</span>
        </div>
      </div>
    </div>
  );
}

