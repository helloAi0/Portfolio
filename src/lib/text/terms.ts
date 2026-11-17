/**
 * Whole-word term matching.
 *
 * Text is normalised into word tokens and 2-3 word phrases, and terms are matched against
 * that set. This avoids substring false positives ("ai" in "email", "ros" in "across",
 * "ml" in "html") that plagued the previous classifier.
 */

/** Lowercase word tokens. Keeps c++ / c# style tokens intact. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+(?:[+#]+)?/g) ?? []).filter(Boolean);
}

/** Set of unigrams, bigrams and trigrams ("machine learning", "ros 2"). */
export function buildGrams(text: string): Set<string> {
  const t = tokenize(text);
  const grams = new Set<string>();
  for (let i = 0; i < t.length; i++) {
    grams.add(t[i]);
    if (i + 1 < t.length) grams.add(`${t[i]} ${t[i + 1]}`);
    if (i + 2 < t.length) grams.add(`${t[i]} ${t[i + 1]} ${t[i + 2]}`);
  }
  return grams;
}

/** Normalises a term the same way text is normalised so "ROS-2" matches "ros 2". */
export function normalizeTerm(term: string): string {
  return tokenize(term).join(' ');
}

/** Returns the terms (normalised) found in the gram set. */
export function matchTerms(grams: Set<string>, terms: readonly string[]): string[] {
  const hits: string[] = [];
  for (const term of terms) {
    const n = normalizeTerm(term);
    if (n && grams.has(n)) hits.push(n);
  }
  return hits;
}
