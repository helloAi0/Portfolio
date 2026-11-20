'use client';

import React from 'react';

export const inputCls = 'w-full bg-imperial-950 border border-neutral-700 rounded p-2 text-xs text-white focus:outline-none focus:border-gold-500';

export type Call = (url: string, method: string, body?: unknown) => Promise<{ ok: boolean; data: any }>;

export function makeCall(onUnauthorized: () => void): Call {
  return async (url, method, body) => {
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (res.status === 401) { onUnauthorized(); return { ok: false, data: {} }; }
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    } catch {
      return { ok: false, data: { error: 'Could not reach the server. Check your connection and try again.' } };
    }
  };
}

/** Uploads one file to /api/admin/uploads. Returns the public-facing URL or an error message. */
export async function uploadFile(file: File): Promise<{ url: string } | { error: string }> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) return { error: data.error || 'Upload failed.' };
    return { url: data.url as string };
  } catch {
    return { error: 'Could not reach the server. The file was not uploaded.' };
  }
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-[11px] text-neutral-400 space-y-1">
      <span>{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-neutral-500">{hint}</span>}
    </label>
  );
}

export function StatusMsg({ msg }: { msg: { type: 'ok' | 'err'; text: string } | null }) {
  if (!msg) return null;
  return (
    <div role="status" className={`p-3 rounded text-xs font-mono border ${msg.type === 'ok' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30' : 'border-red-500/40 text-red-300 bg-red-950/30'}`}>{msg.text}</div>
  );
}
