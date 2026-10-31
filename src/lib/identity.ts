/**
 * Imperial Identity Verification & Dynamic Temporal Computation
 *
 * Enforces dynamic calculations of age, graduation progress,
 * and maintains strict identity verification guardrails.
 */

export interface DynamicIdentity {
  displayName: string;
  contactEmail: string;
  dateOfBirth: Date;
  computedAge: number;
  birthDateFormatted: string;
  academicStatus: {
    institution: string;
    degree: string;
    field: string;
    minor: string;
    enrollmentYear: number;
    expectedGraduationYear: number;
    currentAcademicYear: string;
    isDerivedStatus: boolean;
  };
  identityVerification: {
    status: 'VERIFIED' | 'PENDING_OWNER_CONFIRMATION' | 'DISCREPANCY_FLAGGED';
    isOwnerConfirmed: boolean;
    flagReason: string;
    safetyNotice: string;
  };
}

/**
 * Calculates exact age dynamically from the given birth date.
 * Never hardcodes the age.
 */
export function calculateDynamicAge(birthDate: Date | string): number {
  const dob = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Computes current academic standing dynamically based on enrollment year (2024)
 * and expected graduation year (2028).
 */
export function deriveAcademicStanding(startYear: number = 2024, endYear: number = 2028): {
  yearName: string;
  semesterRange: string;
  progressPercent: number;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 6 = Jul, etc.)

  // Academic year typically rolls over around July/August
  const effectiveYearOffset = currentMonth >= 6 ? currentYear - startYear + 1 : currentYear - startYear;
  
  const clampedYear = Math.max(1, Math.min(4, effectiveYearOffset));
  const totalYears = endYear - startYear;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((clampedYear - 0.5) / totalYears) * 100)));

  const yearNames = ['1st Year (Freshman)', '2nd Year (Sophomore)', '3rd Year (Junior)', '4th Year (Senior)'];
  const semRanges = ['Semesters 1 - 2', 'Semesters 3 - 4', 'Semesters 5 - 6', 'Semesters 7 - 8'];

  return {
    yearName: yearNames[clampedYear - 1] || 'Undergraduate Candidate',
    semesterRange: semRanges[clampedYear - 1] || 'Academic Track',
    progressPercent,
  };
}

/**
 * Resolves verified identity metadata and flags any name/mailbox discrepancy
 * for explicit administrator/owner signoff prior to public deployment.
 */
export function resolveIdentitySafety(): DynamicIdentity {
  const dob = new Date('2006-11-02T00:00:00.000Z');
  const computedAge = calculateDynamicAge(dob);
  const academicStanding = deriveAcademicStanding(2024, 2028);

  const displayName = process.env.OWNER_DISPLAY_NAME || 'Sahil Depurwala';
  const contactEmail = process.env.OWNER_CONTACT_EMAIL || 'tahaudaipurwala68@gmail.com';
  const verificationStatusEnv = process.env.IDENTITY_VERIFICATION_STATUS || 'PENDING_OWNER_CONFIRMATION';

  const isOwnerConfirmed = verificationStatusEnv === 'VERIFIED';

  return {
    displayName,
    contactEmail,
    dateOfBirth: dob,
    computedAge,
    birthDateFormatted: '2 November 2006',
    academicStatus: {
      institution: 'University of Engineering and Management / Institute of Engineering and Management (UEM / IEM), Kolkata',
      degree: 'B.Tech',
      field: 'Computer Science and Engineering (Artificial Intelligence & Machine Learning)',
      minor: 'Cybersecurity',
      enrollmentYear: 2024,
      expectedGraduationYear: 2028,
      currentAcademicYear: academicStanding.yearName,
      isDerivedStatus: true,
    },
    identityVerification: {
      status: isOwnerConfirmed ? 'VERIFIED' : 'PENDING_OWNER_CONFIRMATION',
      isOwnerConfirmed,
      flagReason:
        'Discrepancy detected between display name (Sahil Depurwala) and email mailbox prefix (tahaudaipurwala68). Separate configuration fields maintained pending owner confirmation before public deployment.',
      safetyNotice:
        'IDENTITY SAFETY PROTOCOL ACTIVE: Contact email and display name have distinct identifiers. Do not unify without cryptographic or explicit administrative confirmation.',
    },
  };
}

