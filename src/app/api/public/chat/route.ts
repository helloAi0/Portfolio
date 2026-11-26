// Public chat endpoint (Mode 1 / CONCIERGE only). Same handler as /api/lamo/chat: read-only tools, no browser, no email, no admin writes.
export { POST, dynamic } from '@/app/api/lamo/chat/route';
