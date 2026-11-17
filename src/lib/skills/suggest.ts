import { buildGrams, matchTerms } from '@/lib/text/terms';
import { SKILL_CATALOG } from './catalog';

/**
 * Suggest skill slugs from free text (certificate title/description, etc).
 * Whole-word matching on prose-safe terms only; ambiguous words ("ai", "ml", "web", "ros" inside other
 * words) can no longer fire. Suggestions are for the owner to confirm, never automatic claims.
 */
export function suggestSkillsFromText(text: string): string[] {
  const grams = buildGrams(text);
  return SKILL_CATALOG.filter((s) => matchTerms(grams, s.terms).length > 0).map((s) => s.slug).slice(0, 10);
}
