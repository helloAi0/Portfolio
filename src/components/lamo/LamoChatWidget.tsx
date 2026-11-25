'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AgentIcon } from './AgentIcon';

interface Citation { source: string; title: string; status: string; url?: string }
interface Pill { label: string; href: string }
interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  confidence?: string;
  citations?: Citation[];
  suggestedActions?: Pill[];
  followUps?: string[];
  steps?: string[];
  isUnanswered?: boolean;
  questionId?: string;
  followUpToken?: string;
  time: string;
  error?: boolean;
}

const FALLBACK = "That is a good question, and it is not something Taha has put on record yet, so I will not guess. I have passed it on to him, and you are welcome to leave your email on the Contact page so he can answer you personally.";
const STARTERS = [
  { t: 'Who is Taha?', s: 'A short introduction' },
  { t: 'What projects has he built?', s: 'Real, published work' },
  { t: 'Which skills are verified?', s: 'With evidence' },
  { t: 'How can I contact him?', s: 'Email and links' },
];
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function newSessionId(): string {
  try { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return 'ses_' + crypto.randomUUID().replace(/-/g, ''); } catch { /* fall through */ }
  return 'ses_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Small, safe formatter: paragraphs, "- " lists, **bold**, and https links. Never injects HTML. */
function Rich({ text }: { text: string }) {
  const inline = (s: string, k: string): React.ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).filter(Boolean).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={k + i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      if (/^https?:\/\//.test(part)) return <a key={k + i} href={part} target="_blank" rel="noopener noreferrer" className="text-amber-300 underline underline-offset-2 break-all">{part}</a>;
      return <React.Fragment key={k + i}>{part}</React.Fragment>;
    });
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (i: number) => { if (list.length) { blocks.push(<ul key={'u' + i} className="my-1.5 space-y-1 pl-4 list-disc marker:text-amber-400/70">{list.map((l, j) => <li key={j}>{inline(l, `l${i}${j}`)}</li>)}</ul>); list = []; } };
  text.split('\n').forEach((line, i) => {
    const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (m) { list.push(m[1]); return; }
    flush(i);
    if (line.trim()) blocks.push(<p key={'p' + i} className="my-1.5">{inline(line, `p${i}`)}</p>);
  });
  flush(9999);
  return <>{blocks}</>;
}

function Tier({ v }: { v: string }) {
  const map: Record<string, [string, string]> = {
    VERIFIED: ['Verified', 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'],
    OWNER_CONFIRMED: ['Stated by owner', 'text-amber-300 border-amber-400/30 bg-amber-400/10'],
    IN_PROGRESS: ['In progress', 'text-sky-300 border-sky-400/30 bg-sky-400/10'],
  };
  const m = map[v];
  if (!m) return null;
  return <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${m[1]}`}>{m[0]}</span>;
}

export default function LamoChatWidget() {
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveSteps, setLiveSteps] = useState<string[]>([]);
  const [typing, setTyping] = useState<{ id: string; shown: number } | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [mail, setMail] = useState<Record<string, string>>({});
  const [mailState, setMailState] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
  const [copied, setCopied] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let sid: string | null = null;
    try { sid = localStorage.getItem('lamo_session_id'); } catch { /* storage blocked */ }
    if (sid && !/^[A-Za-z0-9_-]{16,64}$/.test(sid)) sid = null;
    if (!sid) { sid = newSessionId(); try { localStorage.setItem('lamo_session_id', sid); } catch { /* ignore */ } }
    setSessionId(sid);
  }, []);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: reduce.current ? 'auto' : 'smooth', block: 'end' }); }, [messages, liveSteps, typing, open, busy]);
  useEffect(() => { if (open) setTimeout(() => boxRef.current?.focus(), 60); }, [open]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);

  // typewriter reveal of the newest answer
  useEffect(() => {
    if (!typing) return;
    const m = messages.find((x) => x.id === typing.id);
    if (!m) { setTyping(null); return; }
    if (typing.shown >= m.content.length) { setTyping(null); return; }
    const step = Math.max(2, Math.round(m.content.length / 90));
    const t = setTimeout(() => setTyping({ id: typing.id, shown: Math.min(m.content.length, typing.shown + step) }), 16);
    return () => clearTimeout(t);
  }, [typing, messages]);

  const send = useCallback(async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const history = messages.filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, content: m.content }));
    setMessages((p) => [...p, { id: uid('u'), role: 'USER', content: q, time: now() }]);
    setInput('');
    setBusy(true);
    setLiveSteps([]);
    let final: any = null;
    try {
      const res = await fetch('/api/lamo/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q, sessionId, history, stream: true }) });
      if (!res.ok || !res.body) { final = await res.json().catch(() => ({})); }
      else {
        const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
            if (!line) continue;
            try {
              const ev = JSON.parse(line);
              if (ev.type === 'step') setLiveSteps((s) => [...s, ev.label]);
              else if (ev.type === 'done') final = ev;
            } catch { /* ignore a partial line */ }
          }
        }
      }
    } catch { /* network error handled below */ }
    const id = uid('a');
    const ok = final && typeof final.answer === 'string' && final.answer;
    setMessages((p) => [...p, {
      id, role: 'ASSISTANT', time: now(), error: !ok,
      content: ok ? final.answer : FALLBACK,
      confidence: ok ? final.confidence : 'UNKNOWN',
      citations: final?.citations ?? [], suggestedActions: final?.suggestedActions ?? [], followUps: final?.followUps ?? [],
      steps: final?.steps ?? [], isUnanswered: !!final?.isUnanswered, questionId: final?.questionId, followUpToken: final?.followUpToken,
    }]);
    setLiveSteps([]);
    setBusy(false);
    if (reduce.current) setTyping(null); else setTyping({ id, shown: 0 });
  }, [input, busy, messages, sessionId]);

  const notify = async (qId: string) => {
    const email = mail[qId]?.trim();
    const token = messages.find((m) => m.questionId === qId && m.followUpToken)?.followUpToken;
    if (!email || !token) { setMailState((s) => ({ ...s, [qId]: 'error' })); return; }
    setMailState((s) => ({ ...s, [qId]: 'sending' }));
    try {
      const r = await fetch('/api/lamo/followup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: qId, followUpToken: token, visitorEmail: email }) });
      setMailState((s) => ({ ...s, [qId]: r.ok ? 'sent' : 'error' }));
    } catch { setMailState((s) => ({ ...s, [qId]: 'error' })); }
  };

  const reset = () => {
    const sid = newSessionId(); setSessionId(sid);
    try { localStorage.setItem('lamo_session_id', sid); } catch { /* ignore */ }
    setMessages([]); setLiveSteps([]); setTyping(null); setBusy(false);
  };
  const copy = async (m: ChatMessage) => { try { await navigator.clipboard.writeText(m.content); setCopied(m.id); setTimeout(() => setCopied(''), 1400); } catch { /* clipboard blocked */ } };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const grow = (el: HTMLTextAreaElement) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; };

  return (
    <div className="fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 font-sans">
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open LAMO, the AI agent" className="lamo-launch group flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-[#0a0d16]/95 border border-amber-300/40 hover:border-amber-300/80 backdrop-blur-md transition hover:scale-[1.03] active:scale-95">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-[#1a2036] to-[#0c1020] border border-amber-300/30"><AgentIcon size={30} /></span>
          <span className="text-left leading-tight">
            <span className="block text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300">AI agent</span>
            <span className="block text-sm font-semibold text-white">Ask LAMO</span>
          </span>
        </button>
      )}

      {open && (
        <section aria-label="LAMO chat" className={`flex flex-col overflow-hidden rounded-2xl border border-amber-300/25 bg-[#080b13] shadow-[0_24px_80px_rgba(0,0,0,.65)] fixed inset-2 sm:static sm:inset-auto ${wide ? 'sm:w-[640px] sm:h-[78vh]' : 'sm:w-[440px] sm:h-[640px]'} sm:max-h-[88vh] max-sm:!w-auto`}>
          <header className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-gradient-to-b from-[#121830] to-[#0b0f1c]">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-[#0d1224] border border-amber-300/30"><AgentIcon size={32} thinking={busy} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white leading-none">LAMO <span className="ml-1 text-[10px] font-mono text-amber-300/90 uppercase tracking-widest">AI agent</span></h2>
              <p className="mt-1 text-[11px] text-neutral-400 flex items-center gap-1.5"><span className={`inline-block w-1.5 h-1.5 rounded-full ${busy ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />{busy ? 'Working through the records…' : 'Answers only from verified records'}</p>
            </div>
            <div className="flex items-center gap-0.5 text-neutral-400">
              <button onClick={() => setWide((w) => !w)} title={wide ? 'Smaller' : 'Larger'} aria-label="Toggle size" className="hidden sm:grid place-items-center w-8 h-8 rounded-lg hover:bg-white/5 hover:text-white"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={wide ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} /></svg></button>
              <button onClick={reset} title="New conversation" aria-label="New conversation" className="grid place-items-center w-8 h-8 rounded-lg hover:bg-white/5 hover:text-white"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg></button>
              <button onClick={() => setOpen(false)} title="Close" aria-label="Close chat" className="grid place-items-center w-8 h-8 rounded-lg hover:bg-white/5 hover:text-white"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            </div>
          </header>

          <div className="lamo-scroll flex-1 overflow-y-auto px-4 py-4 space-y-5" aria-live="polite">
            {messages.length === 0 && (
              <div className="lamo-msg">
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center w-12 h-12 rounded-2xl bg-[#0d1224] border border-amber-300/25"><AgentIcon size={38} /></span>
                  <div><p className="text-base font-semibold text-white">Hi, I&apos;m LAMO.</p><p className="text-xs text-neutral-400">I&apos;m an AI agent for {`Taha Udaipurwala`}&apos;s portfolio.</p></div>
                </div>
                <p className="mt-3 text-sm text-neutral-300 leading-relaxed">I look through his verified projects, skills, education, certificates and coding activity, show you what I checked, and tell you plainly when I don&apos;t know something.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {STARTERS.map((s) => (
                    <button key={s.t} onClick={() => send(s.t)} className="text-left rounded-xl border border-white/8 bg-white/[.03] hover:bg-white/[.07] hover:border-amber-300/40 p-3 transition">
                      <span className="block text-[13px] text-white leading-snug">{s.t}</span>
                      <span className="block mt-1 text-[11px] text-neutral-500">{s.s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const isTyping = typing?.id === m.id;
              const text = isTyping ? m.content.slice(0, typing!.shown) : m.content;
              const done = !isTyping;
              return m.role === 'USER' ? (
                <div key={m.id} className="lamo-msg flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#2a3350] to-[#1c2238] border border-white/10 px-3.5 py-2.5 text-sm text-white whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              ) : (
                <div key={m.id} className="lamo-msg flex gap-2.5">
                  <span className="mt-0.5 shrink-0 grid place-items-center w-7 h-7 rounded-lg bg-[#0d1224] border border-amber-300/25"><AgentIcon size={22} /></span>
                  <div className="min-w-0 flex-1">
                    {m.steps && m.steps.length > 0 && (
                      <details className="mb-1.5 group">
                        <summary className="cursor-pointer list-none text-[11px] font-mono text-neutral-500 hover:text-neutral-300 flex items-center gap-1.5 select-none">
                          <svg className="w-3 h-3 transition group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 6l6 6-6 6" /></svg>
                          Checked {m.steps.length} step{m.steps.length === 1 ? '' : 's'}
                        </summary>
                        <ol className="mt-1.5 ml-1 space-y-1 border-l border-white/10 pl-3">
                          {m.steps.map((s, i) => <li key={i} className="text-[11px] text-neutral-400 flex gap-1.5"><span className="text-emerald-400">✓</span>{s}</li>)}
                        </ol>
                      </details>
                    )}
                    <div className={`text-[13.5px] leading-relaxed text-neutral-200 break-words ${isTyping ? 'lamo-caret' : ''} ${m.error ? 'text-neutral-300' : ''}`}><Rich text={text} /></div>

                    {done && (
                      <>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {m.confidence && !m.error && (m.citations?.length ?? 0) > 0 && <Tier v={m.confidence} />}
                          {m.questionId && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-400/30 text-amber-300 bg-amber-400/10">Ref {m.questionId}</span>}
                          <span className="text-[10px] font-mono text-neutral-600">{m.time}</span>
                          <button onClick={() => copy(m)} className="ml-auto text-[10px] font-mono text-neutral-500 hover:text-white">{copied === m.id ? 'Copied' : 'Copy'}</button>
                        </div>

                        {m.citations && m.citations.length > 0 && (
                          <div className="mt-2.5">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-1">Sources</p>
                            <div className="flex flex-wrap gap-1.5">
                              {m.citations.map((c, i) => {
                                const chip = <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /><span className="truncate">{c.title || c.source}</span></>;
                                const cls = 'inline-flex items-center gap-1.5 max-w-[210px] text-[11px] px-2 py-1 rounded-lg border border-white/10 bg-white/[.03] text-neutral-300';
                                return c.url ? <Link key={i} href={c.url} onClick={() => setOpen(false)} className={cls + ' hover:border-amber-300/50 hover:text-white'}>{chip}</Link> : <span key={i} className={cls}>{chip}</span>;
                              })}
                            </div>
                          </div>
                        )}

                        {m.suggestedActions && m.suggestedActions.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {m.suggestedActions.map((a, i) => <Link key={i} href={a.href} onClick={() => setOpen(false)} className="text-[11px] px-2.5 py-1 rounded-full border border-amber-300/35 text-amber-300 hover:bg-amber-300/10">{a.label} →</Link>)}
                          </div>
                        )}

                        {m.isUnanswered && m.questionId && (
                          <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[.06] p-3">
                            <p className="text-[12px] text-amber-100/90">Want Taha to answer this and tell you? Leave an email and I&apos;ll pass your question on.</p>
                            {mailState[m.questionId] === 'sent' ? <p className="mt-2 text-[12px] text-emerald-300 font-mono">✓ Saved. Taha has been notified.</p> : (
                              <div className="mt-2 flex gap-1.5">
                                <input type="email" placeholder="you@email.com" value={mail[m.questionId] || ''} onChange={(e) => setMail({ ...mail, [m.questionId!]: e.target.value })} className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-amber-300/60" />
                                <button onClick={() => notify(m.questionId!)} disabled={mailState[m.questionId] === 'sending'} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-300 text-black hover:bg-amber-200 disabled:opacity-60">{mailState[m.questionId] === 'sending' ? 'Saving…' : 'Notify me'}</button>
                              </div>
                            )}
                            {mailState[m.questionId] === 'error' && <p className="mt-1.5 text-[11px] text-red-300">That did not go through. Check the email and try again.</p>}
                          </div>
                        )}

                        {m.followUps && m.followUps.length > 0 && m.id === messages[messages.length - 1]?.id && !busy && (
                          <div className="mt-3 flex flex-col gap-1.5">
                            {m.followUps.map((f) => <button key={f} onClick={() => send(f)} className="text-left text-[12px] px-3 py-1.5 rounded-xl border border-white/10 text-neutral-300 hover:text-white hover:border-amber-300/40 hover:bg-white/[.04] transition">↳ {f}</button>)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="lamo-msg flex gap-2.5">
                <span className="mt-0.5 shrink-0 grid place-items-center w-7 h-7 rounded-lg bg-[#0d1224] border border-amber-300/25"><AgentIcon size={22} thinking /></span>
                <ol className="space-y-1 pt-1">
                  {liveSteps.map((s, i) => <li key={i} className="text-[12px] text-neutral-400 flex gap-1.5"><span className={i === liveSteps.length - 1 ? 'text-amber-300 animate-pulse' : 'text-emerald-400'}>{i === liveSteps.length - 1 ? '●' : '✓'}</span>{s}</li>)}
                  {liveSteps.length === 0 && <li className="text-[12px] text-neutral-400 flex gap-1.5"><span className="text-amber-300 animate-pulse">●</span>Thinking…</li>}
                </ol>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <footer className="border-t border-white/5 bg-[#0b0f1c] p-3">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 rounded-2xl border border-white/10 focus-within:border-amber-300/50 bg-black/30 pl-3.5 pr-2 py-2 transition">
              <textarea ref={boxRef} rows={1} value={input} maxLength={500} onChange={(e) => { setInput(e.target.value); grow(e.currentTarget); }} onKeyDown={onKey} placeholder="Ask about his projects, skills, education…" aria-label="Your question" className="flex-1 resize-none bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none py-1 max-h-[120px]" />
              <button type="submit" disabled={!input.trim() || busy} aria-label="Send" className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-200 to-amber-500 text-black disabled:opacity-30 hover:brightness-110 active:scale-95 transition"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>
            </form>
            <p className="mt-1.5 px-1 flex justify-between text-[10px] font-mono text-neutral-600"><span>Enter to send · Shift+Enter for a new line</span><span>{input.length}/500</span></p>
          </footer>
        </section>
      )}
    </div>
  );
}
