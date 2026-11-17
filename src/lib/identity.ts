/**
 * Identity resolution and dynamic temporal computation (server-side only).
 *
 * The date of birth never leaves this module: callers get a derived age, and only
 * when the owner has enabled public age display.
 */

import { PROFILE } from '@/config/profile';
import { computeAcademicStanding, type AcademicStanding } from '@/lib/academic';

export interface DynamicIdentity {
  displayName: string;
  contactEmail: string;
  /** Age in years, or null when age display is disabled or no birth date is configured. */
  publicAge: number | null;
  academicStatus: {
    institution: string | null;
    degree: string;
    field: string;
    minor: string;
    enrollmentYear: number;
    expectedGraduationYear: number;
    currentAcademicYear: string;
    semesterLabel: string;
    phase: AcademicStanding['phase'];
    monthsToGraduation: number;
    progressPercent: number;
  };
  identityVerification: {
    status: 'VERIFIED' | 'PENDING_OWNER_CONFIRMATION';
    isOwnerConfirmed: boolean;
    pendingItems: string[];
  };
}

/** Current calendar date parts in the Asia/Kolkata timezone. */
export function getKolkataDateParts(now: Date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PROFILE.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Exact age in whole years for a YYYY-MM-DD birth date, evaluated on the current
 * date in Asia/Kolkata. Returns null for an invalid date.
 */
export function calculateAge(birthDate: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!m) return null;
  const [by, bm, bd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const today = getKolkataDateParts(now);
  let age = today.year - by;
  if (today.month < bm || (today.month === bm && today.day < bd)) age--;
  return age >= 0 && age < 130 ? age : null;
}

/** Academic year/semester derived from today's date (Asia/Kolkata). See src/lib/academic.ts. */
export function deriveAcademicStanding(
  startYear: number,
  endYear: number,
  now: Date = new Date()
): AcademicStanding & { yearName: string } {
  const { year, month, day } = getKolkataDateParts(now);
  return computeAcademicStanding({ startYear, endYear, oddSemesterStartMonth: PROFILE.education.oddSemesterStartMonth }, year, month, day);
}

export function resolveIdentitySafety(): DynamicIdentity {
  const showAge = process.env.OWNER_SHOW_PUBLIC_AGE === 'true';
  const birth = process.env.OWNER_BIRTH_DATE || '';
  const publicAge = showAge && birth ? calculateAge(birth) : null;

  const standing = deriveAcademicStanding(PROFILE.education.startYear, PROFILE.education.endYear);

  // Controlled identity-verification step: the owner flips this after reviewing the profile.
  const isOwnerConfirmed = process.env.IDENTITY_VERIFICATION_STATUS === 'VERIFIED';
  const pendingItems: string[] = [];
  if (!PROFILE.education.institution) pendingItems.push('Awarding institution not yet confirmed (OWNER_INSTITUTION)');
  if (!PROFILE.linkedinUrl) pendingItems.push('LinkedIn profile URL not set (LINKEDIN_PROFILE_URL)');
  if (!birth) pendingItems.push('Birth date not set (OWNER_BIRTH_DATE) - age cannot be computed');

  return {
    displayName: PROFILE.displayName,
    contactEmail: PROFILE.contactEmail,
    publicAge,
    academicStatus: {
      institution: PROFILE.education.institution,
      degree: PROFILE.education.degree,
      field: PROFILE.education.field,
      minor: PROFILE.education.minor,
      enrollmentYear: PROFILE.education.startYear,
      expectedGraduationYear: PROFILE.education.endYear,
      currentAcademicYear: standing.yearName,
      semesterLabel: standing.semesterLabel,
      phase: standing.phase,
      monthsToGraduation: standing.monthsToGraduation,
      progressPercent: standing.progressPercent,
    },
    identityVerification: {
      status: isOwnerConfirmed ? 'VERIFIED' : 'PENDING_OWNER_CONFIRMATION',
      isOwnerConfirmed,
      pendingItems,
    },
  };
}
