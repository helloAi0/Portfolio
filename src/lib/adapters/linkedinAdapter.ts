/**
 * LinkedIn Integration Module
 *
 * LinkedIn's API access requires OAuth 2.0 and approved developer application.
 * Accessing personal posts programmatically requires the "Share on LinkedIn" API
 * (w_member_social permission) which requires manual approval from LinkedIn.
 *
 * This module:
 * 1. Displays the configured LinkedIn profile URL (always safe).
 * 2. Provides a MANUAL content-import mechanism so the owner can paste post content.
 * 3. Stores approved posts in the LinkedinPost database table.
 * 4. Does NOT scrape LinkedIn, automate login, or access protected endpoints.
 *
 * Future: When LinkedIn API access is approved, swap in the OAuth adapter.
 */

export const LINKEDIN_INTEGRATION_STATUS = {
  connected: false,
  reason: 'LinkedIn personal post API requires OAuth application approval. Using manual import mode.',
  profileUrlConfigured: !!process.env.LINKEDIN_PROFILE_URL,
  profileUrl: process.env.LINKEDIN_PROFILE_URL || 'https://linkedin.com',
  apiAccessMode: 'MANUAL_IMPORT' as 'MANUAL_IMPORT' | 'OAUTH_LIVE',
};

export interface ManualLinkedinPost {
  title?: string;
  contentExcerpt: string;
  postUrl?: string;
  publishedAt: Date;
}

