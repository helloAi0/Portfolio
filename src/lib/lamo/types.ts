/**
 * LAMO (Personal AI Portfolio Manager) Core Types
 * Week 3 Architecture
 */

export type VerificationTier =
  | 'VERIFIED'
  | 'OWNER_CONFIRMED'
  | 'IN_PROGRESS'
  | 'UNKNOWN'
  | 'PRIVATE';

export interface RetrievedKnowledgeChunk {
  id: string;
  source: string; // e.g. "Project:autonomous-rover-slam", "Education:UEM", "Skill:ros2"
  category: string;
  title: string;
  content: string;
  verificationStatus: VerificationTier;
  confidenceScore: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  lastUpdated: string;
  urlPath?: string;
}

export interface NavigationPill {
  label: string;
  href: string;
  badge?: string;
}

export interface LamoResponse {
  answer: string;
  confidence: VerificationTier;
  citations: Array<{ source: string; title: string; status: VerificationTier; url?: string }>;
  suggestedActions: NavigationPill[];
  isUnanswered: boolean;
  questionId?: string;
  missingInformationReason?: string;
}

export interface GuardrailCheck {
  isSafe: boolean;
  violationReason?: string;
  isInjectionAttempt?: boolean;
  isPrivateDataRequest?: boolean;
  isFabricationRequest?: boolean;
}

