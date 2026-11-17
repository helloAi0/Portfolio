/**
 * Pure, dependency-free academic calendar logic. Everything about "where am I in my degree"
 * is derived from the current date, so the site never needs a manual update.
 *
 * Assumption (documented in the UI): semesters run in 6-month blocks starting at
 * `oddSemesterStartMonth` (default July: Jul-Dec = odd semester, Jan-Jun = even semester),
 * the standard Indian B.Tech calendar. Set OWNER_ODD_SEM_START_MONTH if your college differs.
 */

export interface AcademicConfig {
  startYear: number;
  endYear: number;
  /** 1-12. Month in which the odd (1st, 3rd, ...) semester begins. Default 7. */
  oddSemesterStartMonth?: number;
}

export type AcademicPhase = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface AcademicStanding {
  phase: AcademicPhase;
  totalSemesters: number;
  /** 1..totalSemesters (clamped); during NOT_STARTED = 1, after COMPLETED = totalSemesters. */
  semester: number;
  yearNumber: number;
  yearName: string;
  semesterLabel: string;
  /** Continuous 0-100 progress through the whole programme. */
  progressPercent: number;
  /** Whole months until the programme ends (0 once completed). */
  monthsToGraduation: number;
  /** Months elapsed inside the current semester (0-5) and its length, for a small progress bar. */
  semesterProgressPercent: number;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
export const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;

export function computeAcademicStanding(cfg: AcademicConfig, year: number, month: number, day = 1): AcademicStanding {
  const oddStart = Math.min(12, Math.max(1, cfg.oddSemesterStartMonth ?? 7));
  const totalSemesters = Math.max(1, (cfg.endYear - cfg.startYear) * 2);
  const startIdx = cfg.startYear * 12 + (oddStart - 1);
  const nowIdx = year * 12 + (month - 1);
  const m = nowIdx - startIdx; // whole months since the programme started
  const dayFraction = Math.min(1, Math.max(0, (day - 1) / 30));
  const exact = m + dayFraction;

  let phase: AcademicPhase = 'IN_PROGRESS';
  if (m < 0) phase = 'NOT_STARTED';
  else if (m >= totalSemesters * 6) phase = 'COMPLETED';

  const rawSem = Math.floor(Math.max(0, m) / 6) + 1;
  const semester = Math.min(totalSemesters, Math.max(1, rawSem));
  const yearNumber = Math.ceil(semester / 2);
  const totalMonths = totalSemesters * 6;
  const progressPercent = Math.round(Math.min(100, Math.max(0, (exact / totalMonths) * 100)));
  const semesterProgressPercent =
    phase === 'IN_PROGRESS' ? Math.round((((m % 6) + dayFraction) / 6) * 100) : phase === 'COMPLETED' ? 100 : 0;

  return {
    phase,
    totalSemesters,
    semester,
    yearNumber,
    yearName: `${ordinal(yearNumber)} Year`,
    semesterLabel: `Semester ${semester}`,
    progressPercent,
    monthsToGraduation: Math.max(0, totalMonths - Math.max(0, m)),
    semesterProgressPercent,
  };
}

export interface SemesterEntry {
  number: number;
  yearNumber: number;
  label: string;
  /** e.g. "Jul–Dec 2026" */
  window: string;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** One entry per semester with a status derived from today's date. */
export function buildSemesterTrack(cfg: AcademicConfig, year: number, month: number, day = 1): SemesterEntry[] {
  const oddStart = Math.min(12, Math.max(1, cfg.oddSemesterStartMonth ?? 7));
  const standing = computeAcademicStanding(cfg, year, month, day);
  return Array.from({ length: standing.totalSemesters }, (_, i) => {
    const n = i + 1;
    const startIdx = cfg.startYear * 12 + (oddStart - 1) + i * 6;
    const endIdx = startIdx + 5;
    const [sy, sm] = [Math.floor(startIdx / 12), startIdx % 12];
    const [ey, em] = [Math.floor(endIdx / 12), endIdx % 12];
    const window = sy === ey ? `${MONTHS[sm]}–${MONTHS[em]} ${sy}` : `${MONTHS[sm]} ${sy} – ${MONTHS[em]} ${ey}`;
    let status: SemesterEntry['status'];
    if (standing.phase === 'COMPLETED') status = 'COMPLETED';
    else if (standing.phase === 'NOT_STARTED') status = 'UPCOMING';
    else status = n < standing.semester ? 'COMPLETED' : n === standing.semester ? 'CURRENT' : 'UPCOMING';
    return { number: n, yearNumber: Math.ceil(n / 2), label: `Semester ${n}`, window, status };
  });
}
