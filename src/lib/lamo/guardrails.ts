/**
 * LAMO Guardrails & Input/Output Security
 * Enforces prompt injection defense, strict honesty, and privacy boundaries.
 */

import { GuardrailCheck } from './types';

// Patterns that attempt to subvert the system prompt or override instructions
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+(an?\s+)?unrestricted/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /developer\s+mode\s+output/i,
  /pretend\s+you\s+have\s+no\s+rules/i,
  /bypass\s+verification/i,
  /act\s+as\s+a\s+different\s+ai/i,
  /output\s+the\s+entire\s+raw\s+database/i,
  /leak\s+(api\s+)?(key|secret|token|hash)/i,
];

// Patterns that request inventing or fabricating unverified credentials
const FABRICATION_PATTERNS = [
  /invent\s+(a\s+)?(job|experience|project|achievement|award|scholarship|degree)/i,
  /pretend\s+(he|sahil)\s+(has|won|graduated|worked)/i,
  /make\s+up\s+an?\s+(answer|credential|qualification)/i,
  /claim\s+(that\s+)?(he|sahil)\s+is\s+a\s+senior/i,
  /say\s+he\s+has\s+a\s+(phd|masters|gpa)/i,
];

// Patterns targeting internal administrative secrets
const SENSITIVE_DATA_PATTERNS = [
  /password(\s+|_)?(hash)?/i,
  /admin(\s+|_)?(session|password|secret|key|token)/i,
  /jwt(\s+|_)?secret/i,
  /cron(\s+|_)?secret/i,
  /webhook(\s+|_)?secret/i,
  /github(\s+|_)?token/i,
  /database(\s+|_)?(url|secret|connection|password|string)/i,
  /secret(\s+|_)?key/i,
  /owner\s+password/i,
];

export function inspectUserInput(input: string): GuardrailCheck {
  const text = input.trim();

  // Length limits to prevent denial of service or context window exhaustion
  if (text.length === 0) {
    return { isSafe: false, violationReason: 'Question cannot be empty.' };
  }
  if (text.length > 1000) {
    return { isSafe: false, violationReason: 'Question exceeds maximum permitted length (1000 characters).' };
  }

  // Check injection attempts
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSafe: false,
        isInjectionAttempt: true,
        violationReason: 'Instruction override or prompt injection attempt detected. LAMO operates strictly within verified boundaries.',
      };
    }
  }

  // Check fabrication requests
  for (const pattern of FABRICATION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSafe: false,
        isFabricationRequest: true,
        violationReason: 'Fabrication request detected. Under Project LAMO anti-hallucination policies, I never fabricate unverified experience, qualifications, or metrics.',
      };
    }
  }

  // Check private data probe
  for (const pattern of SENSITIVE_DATA_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSafe: false,
        isPrivateDataRequest: true,
        violationReason: 'Internal credential or private configuration inquiry denied.',
      };
    }
  }

  return { isSafe: true };
}

/**
 * Standard insufficient evidence phrase required by Section 4
 */
export const INSUFFICIENT_EVIDENCE_PHRASE =
  "I don't currently have verified information about that specific experience. I can forward this question to the portfolio owner for clarification.";

/**
 * Sanitizes output to ensure no secrets or private tokens leak into user responses
 */
export function sanitizeOutput(output: string): string {
  let cleaned = output;
  // Strip any accidental environment variable or token leaks
  cleaned = cleaned.replace(/ey[A-Za-z0-9_-]{20,}/g, '[REDACTED_TOKEN]');
  cleaned = cleaned.replace(/ghp_[A-Za-z0-9]{20,}/g, '[REDACTED_KEY]');
  cleaned = cleaned.replace(/imperial-[A-Za-z0-9-]{10,}/g, '[REDACTED_SECRET]');
  return cleaned;
}
