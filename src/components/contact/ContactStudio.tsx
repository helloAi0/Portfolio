'use client';

import React, { useState } from 'react';
import { Mail, Github, Linkedin, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { MatrixRain, TerminalIntro, Scramble } from './HackerBits';
import { useNow } from '@/components/ui/LiveClock';

const field = 'w-full px-4 py-3 rounded bg-black/60 border border-emerald-400/20 text-emerald-50 font-mono text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-300 focus:shadow-[0_0_0_3px_rgba(57,255,136,0.12)] transition';

export function ContactStudio({ email, github, linkedin, location }: { email: string; github: string; linkedin: string | null; location: string }) {
  const now = useNow(15000);
  const [f, setF] = useState({ senderName: '', senderEmail: '', senderPhone: '', subject: '', message: '', website_hp: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [err, setErr] = useState('');

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
      <section className="relative overflow-hidden border-b border-emerald-400/10">
        <MatrixRain />
        <div aria-hidden className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_30%_40%,rgba(4,10,8,0.2),rgba(4,8,7,0.92)_75%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 grid lg:grid-cols-2 gap-10 items-center min-h-[78vh]">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.3em] text-emerald-300">{"// secure channel · open"}</p>
            <h1 className="font-serif font-black text-white text-5xl sm:text-7xl leading-[0.98] mt-3"><Scramble text="Let's build something." /></h1>
            <p className="mt-5 text-neutral-300 text-lg max-w-md leading-relaxed">You found the right door. An opportunity, a collaboration, or a hard question about security, AI or robotics: send it through.</p>

            <div className="mt-6 inline-flex items-center gap-3 rounded border border-emerald-400/30 bg-black/50 px-4 py-2 text-sm font-mono" aria-live="polite">
              <span className={'w-2.5 h-2.5 rounded-full ' + (awake ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} aria-hidden />
              <span className="text-neutral-200">{kolkata ? <>local time <b className="text-emerald-300">{kolkata} IST</b> · Kolkata</> : 'Kolkata, India'}</span>
            </div>

            <ul className="mt-8 space-y-3 text-sm font-mono">
              <li><a href={`mailto:${email}`} className="group inline-flex items-center gap-3 text-neutral-200 hover:text-emerald-300"><span className="w-9 h-9 rounded border border-emerald-400/40 grid place-items-center group-hover:bg-emerald-400/10"><Mail className="w-4 h-4 text-emerald-300" aria-hidden /></span><span className="break-all">{email}</span></a></li>
              <li><a href={github} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3 text-neutral-200 hover:text-emerald-300"><span className="w-9 h-9 rounded border border-emerald-400/40 grid place-items-center group-hover:bg-emerald-400/10"><Github className="w-4 h-4 text-emerald-300" aria-hidden /></span>{github.replace('https://', '')}</a></li>
              {linkedin && <li><a href={linkedin} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3 text-neutral-200 hover:text-emerald-300"><span className="w-9 h-9 rounded border border-emerald-400/40 grid place-items-center group-hover:bg-emerald-400/10"><Linkedin className="w-4 h-4 text-emerald-300" aria-hidden /></span>LinkedIn</a></li>}
              <li className="inline-flex items-center gap-3 text-neutral-300"><span className="w-9 h-9 rounded border border-emerald-400/40 grid place-items-center"><MapPin className="w-4 h-4 text-emerald-300" aria-hidden /></span>{location}</li>
            </ul>
          </div>
          <TerminalIntro clock={kolkata} />
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-3xl mx-auto rounded-xl border border-emerald-400/30 bg-[#050a08]/90 p-6 sm:p-10 shadow-[0_0_80px_rgba(57,255,136,0.08)]">
          <p className="font-mono text-xs text-emerald-300">$ ./send_message --to taha</p>
          <h2 className="font-serif font-black text-white text-3xl mt-2">Write to me</h2>
          <p className="text-neutral-400 text-sm mt-2">Only your email is required, so I can reply.</p>

          <div aria-live="polite" className="mt-5">
            {status === 'success' && <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden /> Delivered. Thank you for writing.</div>}
            {status === 'error' && <div className="p-4 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" aria-hidden /> {err || 'Could not send the message. Please try again.'}</div>}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <input type="text" name="website_hp" value={f.website_hp} onChange={(e) => setF({ ...f, website_hp: e.target.value })} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="grid sm:grid-cols-2 gap-5">
              <label className="block"><span className="text-xs font-mono uppercase tracking-wider text-emerald-200/70">Your email <span className="text-emerald-300">*</span></span>
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
            <button type="submit" disabled={status === 'loading'} className="w-full inline-flex items-center justify-center gap-2 rounded bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-black font-mono font-bold py-3.5 transition-colors">
              <Send className="w-4 h-4" aria-hidden /> {status === 'loading' ? 'Sending…' : '> Send message'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
