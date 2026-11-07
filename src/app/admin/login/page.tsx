'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Lock, ShieldAlert, ArrowRight, Terminal } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication denied.');
      }

      router.push('/admin');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-md bg-gradient-to-br from-gold-500/20 via-imperial-800 to-imperial-950 border border-gold-500/40 flex items-center justify-center mx-auto mb-4 shadow-imperial-gold">
            <span className="font-serif font-black text-2xl text-gold-400">Λ</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            Citadel Command Gate
          </h1>
          <p className="text-xs font-mono text-gold-400/80 mt-1 uppercase tracking-widest">
            Project LAMO • Admin Access
          </p>
        </div>

        <Card variant="marble" className="p-8 border-gold-500/30">
          {error && (
            <div className="p-3.5 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono mb-6 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 text-xs font-mono">
            <div className="space-y-1.5">
              <label className="text-neutral-400 uppercase text-[10px] block">
                Command Identifier (Username)
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="sahil"
                className="w-full px-4 py-2.5 rounded bg-imperial-900 border border-gold-500/20 text-white placeholder-neutral-600 focus:outline-none focus:border-gold-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-neutral-400 uppercase text-[10px] block">
                Imperial Key (Password)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-4 py-2.5 rounded bg-imperial-900 border border-gold-500/20 text-white placeholder-neutral-600 focus:outline-none focus:border-gold-400 transition-colors"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                size="md"
                className="w-full"
                icon={<Lock className="w-4 h-4" />}
              >
                {loading ? 'Authenticating...' : 'Enter Citadel Dashboard'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5 text-[10px] font-mono text-neutral-500 text-center">
            Default credentials for local dev seeded: <code className="text-gold-400">sahil</code> / <code className="text-gold-400">imperial-admin-2026</code>
          </div>
        </Card>
      </div>
    </div>
  );
}

