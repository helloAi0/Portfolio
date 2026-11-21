'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mail, Github, Linkedin, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNow } from '@/components/ui/LiveClock';

const field = 'w-full px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-gold-400 focus:bg-white/[0.07] transition-colors';

export function ContactStudio({ email, github, linkedin, location }: { email: string; github: string; linkedin: string | null; location: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const now = useNow(15000);
  const [f, setF] = useState({ senderName: '', senderEmail: '', senderPhone: '', subject: '', message: '', website_hp: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let ctl: { dispose: () => void } | null = null, dead = false;
    import('@/lib/three/contactGlobe').then(({ createContactGlobe }) => {
      if (dead || !canvasRef.current) return;
      try { ctl = createContactGlobe({ canvas: canvasRef.current }); } catch { /* no WebGL: the page works without the globe */ }
    });
    return () => { dead = true; ctl?.dispose(); };
  }, []);

  const kolkata = now ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(now).toUpperCase() : null;
  const hour = now ? Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(now)) % 24 : 12;
  const awake = hour >= 8 && hour < 23;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setStatus('loading'); setErr('');
    try {
      const res = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send the message.');
      setStatus('success'); setF({ senderName: '', senderEmail: '', senderPhone: '', subject: '', message: '', website_hp: '' });
    } catch (x) { setStatus('error'); setErr((x as Error).message); }
  };

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 grid lg:grid-cols-2 gap-6 items-center min-h-[78vh]">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold-400">Contact</p>
            <h1 className="font-serif font-black text-white text-5xl sm:text-7xl leading-[0.98] mt-3">Let&apos;s build<br />something.</h1>
            <p className="mt-5 text-neutral-300 text-lg max-w-md leading-relaxed">An opportunity, a collaboration, or a question about my work. Write to me below, or reach me directly.</p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-gold-500/30 bg-black/40 px-4 py-2 text-sm" aria-live="polite">
              <span className={'w-2.5 h-2.5 rounded-full ' + (awake ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} aria-hidden />
              <span className="text-neutral-200">{kolkata ? <>It&apos;s <b className="text-white">{kolkata}</b> in Kolkata right now</> : 'Kolkata, India'}</span>
            </div>

            <ul className="mt-8 space-y-3 text-sm">
              <li><a href={`mailto:${email}`} className="group inline-flex items-center gap-3 text-neutral-200 hover:text-gold-300"><span className="w-9 h-9 rounded-full border border-gold-500/40 grid place-items-center group-hover:bg-gold-500/10"><Mail className="w-4 h-4 text-gold-400" aria-hidden /></span><span className="break-all">{email}</span></a></li>
              <li><a href={github} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3 text-neutral-200 hover:text-gold-300"><span className="w-9 h-9 rounded-full border border-gold-500/40 grid place-items-center group-hover:bg-gold-500/10"><Github className="w-4 h-4 text-gold-400" aria-hidden /></span>{github.replace('https://', '')}</a></li>
              {linkedin && <li><a href={linkedin} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3 text-neutral-200 hover:text-gold-300"><span className="w-9 h-9 rounded-full border border-gold-500/40 grid place-items-center group-hover:bg-gold-500/10"><Linkedin className="w-4 h-4 text-gold-400" aria-hidden /></span>LinkedIn</a></li>}
              <li className="inline-flex items-center gap-3 text-neutral-300"><span className="w-9 h-9 rounded-full border border-gold-500/40 grid place-items-center"><MapPin className="w-4 h-4 text-gold-400" aria-hidden /></span>{location}</li>
            </ul>
          </div>
          <div className="order-1 lg:order-2 relative h-[320px] sm:h-[460px] lg:h-[640px]">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-3xl mx-auto rounded-2xl border border-gold-500/25 bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-10 shadow-[0_0_80px_rgba(243,201,105,0.08)]">
          <h2 className="font-serif font-black text-white text-3xl">Write to me</h2>
          <p className="text-neutral-400 text-sm mt-2">Only your email is required, so I can reply.</p>

          <div aria-live="polite" className="mt-5">
            {status === 'success' && <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden /> Sent. Thank you for writing.</div>}
            {status === 'error' && <div className="p-4 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" aria-hidden /> {err || 'Could not send the message. Please try again.'}</div>}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <input type="text" name="website_hp" value={f.website_hp} onChange={(e) => setF({ ...f, website_hp: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="grid sm:grid-cols-2 gap-5">
              <label className="block"><span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Your email <span className="text-gold-400">*</span></span>
                <input id="contact-email" type="email" required value={f.senderEmail} onChange={(e) => setF({ ...f, senderEmail: e.target.value })} placeholder="you@company.com" className={field + ' mt-2'} /></label>
              <label className="block"><span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Your name</span>
                <input id="contact-name" type="text" value={f.senderName} onChange={(e) => setF({ ...f, senderName: e.target.value })} placeholder="Your name" className={field + ' mt-2'} /></label>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <label className="block"><span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Phone</span>
                <input id="contact-phone" type="tel" value={f.senderPhone} onChange={(e) => setF({ ...f, senderPhone: e.target.value })} placeholder="Optional" className={field + ' mt-2'} /></label>
              <label className="block"><span className="text-xs font-mono uppercase tracking-wider text-neutral-400">What is it about?</span>
                <input id="contact-subject" type="text" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="e.g. Internship, collaboration" className={field + ' mt-2'} /></label>
            </div>
            <label className="block"><span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Message</span>
              <textarea id="contact-message" rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Tell me a little about what you have in mind." className={field + ' mt-2 resize-none'} /></label>
            <button type="submit" disabled={status === 'loading'} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gold-400 hover:bg-gold-300 disabled:opacity-60 text-black font-semibold py-3.5 transition-colors">
              <Send className="w-4 h-4" aria-hidden /> {status === 'loading' ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
