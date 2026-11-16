/**
 * Single source of truth for the public owner identity.
 *
 * Everything the public site shows about "who the owner is" must come from here
 * (or from the database profile record, which is seeded from here).
 *
 * PRIVACY RULES
 * - The date of birth is NEVER hardcoded in the repository. It is read from the
 *   server-only environment variable OWNER_BIRTH_DATE (YYYY-MM-DD) and is never
 *   sent to the browser or shown publicly. Only the derived age may be shown, and
 *   only when OWNER_SHOW_PUBLIC_AGE=true.
 * - The awarding institution is shown only after the owner confirms it by setting
 *   OWNER_INSTITUTION. Until then it is simply omitted from public pages.
 */

export const PROFILE = {
  displayName: process.env.OWNER_DISPLAY_NAME || 'Taha Udaipurwala',
  contactEmail: process.env.OWNER_CONTACT_EMAIL || 'tahaudaipurwala68@gmail.com',
  github: {
    username: process.env.GITHUB_USERNAME || 'helloAi0',
    url: `https://github.com/${process.env.GITHUB_USERNAME || 'helloAi0'}`,
  },
  /** Real profile URL only. null => LinkedIn is not shown anywhere publicly. */
  linkedinUrl: process.env.LINKEDIN_PROFILE_URL?.trim() || null,
  location: 'Kolkata, West Bengal, India',
  headline: 'Aspiring AI/ML and Robotics Engineer',
  education: {
    degree: 'B.Tech',
    field: 'Computer Science and Engineering (Artificial Intelligence and Machine Learning)',
    minor: 'Cybersecurity',
    startYear: 2024,
    endYear: 2028,
    /** Owner-confirmed awarding institution. null => not displayed. */
    institution: process.env.OWNER_INSTITUTION?.trim() || null,
  },
  schools: ['Saini Golden Jubilee High School', 'Nischintapur Public School'],
  timezone: 'Asia/Kolkata',
} as const;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
