/** Telegram approval cards (optional). Server-only: the bot token never reaches the browser. Without a token everything is a quiet no-op. */
import { logger } from '@/lib/logger';

export interface Button { text: string; data?: string; url?: string }
const token = () => process.env.TELEGRAM_BOT_TOKEN;
export const telegramChatId = () => process.env.TELEGRAM_CHAT_ID;
export const telegramConfigured = () => !!(token() && telegramChatId());
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const adminUrl = (tab = '') => `${siteUrl()}/admin${tab ? `#${tab}` : ''}`;
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

async function api(method: string, body: unknown) {
  const t = token(); if (!t) return { ok: false, error: 'not configured' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${t}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    const j: any = await r.json().catch(() => ({})); if (!r.ok || !j.ok) logger.warn('Telegram', `${method} failed: ${String(j.description || r.status).slice(0, 120)}`);
    return { ok: !!j.ok, error: j.description as string | undefined };
  } catch (e) { logger.warn('Telegram', `${method} error: ${(e as Error).message}`); return { ok: false, error: (e as Error).message }; }
}

/** Sends a card to the owner's chat only. `rows` are inline-keyboard rows. */
export function sendCard(title: string, lines: string[], rows: Button[][]) {
  if (!telegramConfigured()) return Promise.resolve({ ok: false, error: 'not configured' });
  const text = [`<b>${esc(title)}</b>`, ...lines.map(esc)].join('\n').slice(0, 3800);
  return api('sendMessage', { chat_id: telegramChatId(), text, parse_mode: 'HTML', disable_web_page_preview: true,
    reply_markup: { inline_keyboard: rows.map((r) => r.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: (b.data || '').slice(0, 64) }))) } });
}
export const answerCallback = (id: string, text: string) => api('answerCallbackQuery', { callback_query_id: id, text: text.slice(0, 190) });
export const editCard = (chatId: number | string, messageId: number, text: string) => api('editMessageText', { chat_id: chatId, message_id: messageId, text: text.slice(0, 3800) });

export const certCard = (c: { id: string; title: string; issuer: string; confidence: number | null; needsUrlReview: boolean; hasPdf: boolean }) =>
  sendCard('New certificate to review', [`${c.title}`, `${c.issuer}`, `Confidence ${c.confidence != null ? Math.round(c.confidence * 100) + '%' : 'n/a'}${c.hasPdf ? ' · PDF attached' : ''}${c.needsUrlReview ? ' · needs URL review' : ''}`],
    [[{ text: '✅ Approve', data: `cert:approve:${c.id}` }, { text: '✏️ Edit', url: adminUrl('certificates') }, { text: '❌ Reject', data: `cert:reject:${c.id}` }]]);
export const mailCard = (d: { id: string; to: string; company: string; subject: string }) =>
  sendCard('Cold email draft awaiting approval', [`To: ${d.to} (${d.company})`, d.subject, 'Nothing is sent from here: you send it yourself after approving.'],
    [[{ text: '✅ Approve', data: `mail:approve:${d.id}` }, { text: '✏️ Edit', url: adminUrl('outreach') }, { text: '❌ Reject', data: `mail:reject:${d.id}` }]]);
export const jobCard = (j: { id: string; title: string; company: string; score: number; resume: string; url: string; essayFree: boolean }) =>
  sendCard('Job ready for one-click review', [`${j.title}, ${j.company}`, `Match ${j.score}/100 · attach: ${j.resume}`, j.essayFree ? 'No essay questions detected.' : 'Check the form for custom questions.'],
    [[{ text: '🔗 Open posting', url: j.url }, { text: '📋 Details', url: adminUrl('job-agent') }], [{ text: '✅ I applied', data: `job:applied:${j.id}` }, { text: '⏭ Skip', data: `job:skipped:${j.id}` }]]);
