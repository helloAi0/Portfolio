/**
 * LAMO guardrails: input inspection, honesty phrase, output sanitising.
 * These are a first filter. The real protection is architectural: the model only ever sees
 * retrieved PUBLIC records, has no tools, and its output is validated against those records.
 */
import { GuardrailCheck } from './types';

export const INSUFFICIENT_EVIDENCE_PHRASE =
  "I don't currently have verified information about that specific experience. I can forward this question to the portfolio owner for clarification.";

/** Collapse tricks used to dodge pattern matching (zero-width chars, homoglyph spacing, leetspeak). */
export function normalizeForInspection(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[​-‏⁠﻿­]/g, '')
    .toLowerCase()
    .replace(/[0]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/5/g, 's').replace(/\$/g, 's')
    .replace(/[_\-.*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INJECTION_PATTERNS: RegExp[] = [
  /(ignore|disregard|forget|override|bypass|skip)\s+(all\s+|any\s+|the\s+|your\s+|my\s+)*(previous|prior|above|earlier|preceding|system|safety|these)?\s*(instructions?|rules?|guidelines?|prompts?|polic(y|ies)|restrictions?|verification)/,
  /(reveal|show|print|repeat|output|display|tell me|leak)\s+(me\s+)?(your|the)\s+(system|hidden|initial|original|secret)?\s*(prompt|instructions?|rules)/,
  /system\s*(prompt|message|instruction)/,
  /(you are|act as|behave as|pretend (to be|you are)|roleplay as)\s+(now\s+)?(an?\s+)?(unrestricted|unfiltered|jailbroken|different|new|evil|dan\b)/,
  /\bjailbreak/, /\bdan mode\b/, /developer mode/, /do anything now/,
  /pretend (you )?(have|has) no (rules|restrictions|limits)/,
  /(output|dump|print|show|list)\s+(the\s+)?(entire\s+|whole\s+|full\s+|raw\s+)?(raw\s+)?(database|knowledge base|all records|all chunks|context)/,
  /<\s*\/?\s*(system|assistant|instructions?)\s*>/, /\[\s*(system|inst)\s*\]/,
  /(new|updated)\s+instructions?\s*:/,
];

const FABRICATION_PATTERNS: RegExp[] = [
  /(invent|fabricate|make up|fake|create)\s+(a\s+|an\s+|some\s+)?(job|experience|project|achievement|award|scholarship|degree|certificat\w*|publication|internship|grade|gpa|cgpa|ranking)/,
  /pretend\s+(he|she|they|taha)\s+(has|have|had|won|graduated|worked|published)/,
  /(say|claim|state|tell (them|me)|write)\s+(that\s+)?(he|she|taha)\s+(is|has|was|won|worked|got|holds)\s+(a\s+|an\s+)?(senior|phd|masters?|gpa|cgpa|scholar|intern|award|published)/,
  /make up\s+(an?\s+)?(answer|credential|qualification)/,
];

const SENSITIVE_PATTERNS: RegExp[] = [
  /password/, /passwd/, /pass word/, /\b(admin|owner)\s+(login|session|secret|key|token|credentials?|account)/,
  /jwt/, /cron secret/, /webhook secret/, /github token/, /api\s*key/, /secret\s*key/, /private\s*key/,
  /database\s*(url|secret|connection|password|string|dump)/, /\benv(ironment)?\s*(variables?|file)\b/, /\.env\b/,
  /(date of birth|birth\s*date|\bdob\b|birthday|how old (is|are)|home address|phone number|personal (phone|number|address))/,
];

export function inspectUserInput(input: string): GuardrailCheck {
  const text = input.trim();
  if (text.length === 0) return { isSafe: false, violationReason: 'Question cannot be empty.' };
  if (text.length > 1000) return { isSafe: false, violationReason: 'Question exceeds maximum permitted length (1000 characters).' };

  const raw = text.toLowerCase();
  const norm = normalizeForInspection(text);
  const hit = (list: RegExp[]) => list.some((p) => p.test(raw) || p.test(norm));

  if (hit(INJECTION_PATTERNS)) {
    return { isSafe: false, isInjectionAttempt: true, violationReason: 'Instruction override attempt. LAMO operates strictly within verified portfolio information.' };
  }
  if (hit(FABRICATION_PATTERNS)) {
    return { isSafe: false, isFabricationRequest: true, violationReason: 'LAMO never fabricates experience, qualifications or results.' };
  }
  if (hit(SENSITIVE_PATTERNS)) {
    return { isSafe: false, isPrivateDataRequest: true, violationReason: 'Private or credential information is not available through LAMO.' };
  }
  return { isSafe: true };
}

/** A message that is ONLY a greeting / "what can you do" (never a smuggled question). */
export function isPureGreeting(message: string): boolean {
  return /^(hi|hello|hey|hii+|greetings|good (morning|afternoon|evening)|namaste|who are you\??|what are you\??|what is lamo\??|what can you do\??|help)[\s!.?]*$/i.test(message.trim());
}

/** Strip secrets/tokens that must never appear in a visitor-facing answer. */
export function sanitizeOutput(output: string): string {
  return output
    .replace(/ey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_TOKEN]')
    .replace(/gh[pousr]_[A-Za-z0-9]{20,}/g, '[REDACTED_KEY]')
    .replace(/AIza[0-9A-Za-z_-]{30,}/g, '[REDACTED_KEY]')
    .replace(/re_[A-Za-z0-9]{20,}/g, '[REDACTED_KEY]')
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED_KEY]');
}
