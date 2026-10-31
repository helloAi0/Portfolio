/**
 * Classification Engine
 *
 * Analyzes GitHub repository metadata (languages, topics, README, name)
 * to suggest project categories, subcategories, and associated skills.
 *
 * Rules-based with confidence scoring. Never silently publishes results.
 * All suggestions require owner approval before the Project row is published.
 */

import { logger } from '@/lib/logger';

export interface ClassificationResult {
  suggestedCategorySlug: string;
  suggestedSubcategory: string;
  suggestedSkills: string[];       // skill slugs from our taxonomy
  confidenceScore: number;          // 0.0 – 1.0
  classificationNotes: string;
  readmeSummary: string;
}

// Mapping rules: arrays of keywords → category slugs & sub-track labels
const CATEGORY_RULES: Array<{
  categorySlug: string;
  subcategory: string;
  topicKeywords: string[];
  languageKeywords: string[];
  nameKeywords: string[];
  skillSlugs: string[];
  weight: number;
}> = [
  {
    categorySlug: 'robotics',
    subcategory: 'ROS 2 / SLAM',
    topicKeywords: ['ros', 'ros2', 'slam', 'navigation', 'robot', 'autonomous', 'lidar', 'gazebo', 'rviz'],
    languageKeywords: ['CMake', 'Shell'],
    nameKeywords: ['robot', 'slam', 'nav', 'autonomous', 'rover'],
    skillSlugs: ['robotics', 'ros2', 'cpp', 'python'],
    weight: 10,
  },
  {
    categorySlug: 'artificial-intelligence',
    subcategory: 'Neural Networks / AI Systems',
    topicKeywords: ['ai', 'neural-network', 'deep-learning', 'llm', 'transformer', 'nlp', 'gpt', 'inference'],
    languageKeywords: ['Python', 'Jupyter Notebook'],
    nameKeywords: ['ai', 'neural', 'llm', 'gpt', 'intelligence'],
    skillSlugs: ['python', 'artificial-intelligence'],
    weight: 9,
  },
  {
    categorySlug: 'machine-learning',
    subcategory: 'Computer Vision / ML',
    topicKeywords: ['machine-learning', 'ml', 'computer-vision', 'opencv', 'pytorch', 'tensorflow', 'scikit', 'dataset', 'model'],
    languageKeywords: ['Python', 'Jupyter Notebook'],
    nameKeywords: ['ml', 'vision', 'predict', 'classify', 'model'],
    skillSlugs: ['python', 'machine-learning'],
    weight: 8,
  },
  {
    categorySlug: 'cybersecurity',
    subcategory: 'Security & Cryptography',
    topicKeywords: ['security', 'cryptography', 'penetration', 'ctf', 'exploit', 'vulnerability', 'hacking', 'zero-trust'],
    languageKeywords: ['Python', 'C', 'Shell'],
    nameKeywords: ['security', 'cipher', 'crypt', 'pentest', 'ctf'],
    skillSlugs: ['cybersecurity', 'python', 'c'],
    weight: 8,
  },
  {
    categorySlug: 'frontend-development',
    subcategory: 'React / Next.js',
    topicKeywords: ['react', 'nextjs', 'frontend', 'tailwind', 'typescript', 'threejs', 'webgl', 'ui'],
    languageKeywords: ['TypeScript', 'JavaScript', 'CSS'],
    nameKeywords: ['ui', 'frontend', 'web', 'portfolio', 'dashboard'],
    skillSlugs: ['javascript', 'nextjs', 'threejs', 'html', 'css'],
    weight: 7,
  },
  {
    categorySlug: 'backend-development',
    subcategory: 'APIs & Distributed Systems',
    topicKeywords: ['api', 'rest', 'graphql', 'microservice', 'backend', 'database', 'postgresql', 'prisma', 'auth'],
    languageKeywords: ['TypeScript', 'JavaScript', 'Go', 'Rust', 'Java'],
    nameKeywords: ['api', 'server', 'backend', 'service', 'auth'],
    skillSlugs: ['javascript', 'postgresql-prisma'],
    weight: 6,
  },
  {
    categorySlug: 'full-stack-development',
    subcategory: 'End-to-End Application',
    topicKeywords: ['fullstack', 'full-stack', 'monorepo', 'nextjs', 'express'],
    languageKeywords: ['TypeScript', 'JavaScript'],
    nameKeywords: ['app', 'platform', 'system'],
    skillSlugs: ['javascript', 'nextjs', 'postgresql-prisma'],
    weight: 5,
  },
  {
    categorySlug: 'cloud-and-devops',
    subcategory: 'Cloud Infrastructure & CI/CD',
    topicKeywords: ['docker', 'kubernetes', 'ci-cd', 'github-actions', 'terraform', 'aws', 'gcp', 'azure', 'devops'],
    languageKeywords: ['Shell', 'HCL', 'Dockerfile'],
    nameKeywords: ['infra', 'deploy', 'devops', 'cloud'],
    skillSlugs: ['cloud-computing'],
    weight: 6,
  },
  {
    categorySlug: 'automation',
    subcategory: 'Process Automation',
    topicKeywords: ['automation', 'scraper', 'bot', 'script', 'scheduler', 'workflow'],
    languageKeywords: ['Python', 'Shell'],
    nameKeywords: ['auto', 'bot', 'script', 'scraper'],
    skillSlugs: ['python'],
    weight: 5,
  },
  {
    categorySlug: 'research-and-experiments',
    subcategory: 'Research Prototype',
    topicKeywords: ['research', 'experiment', 'proof-of-concept', 'study', 'paper'],
    languageKeywords: ['Jupyter Notebook', 'Python'],
    nameKeywords: ['research', 'study', 'experiment', 'poc'],
    skillSlugs: ['python'],
    weight: 4,
  },
];

// Simple extractive summary: first paragraph of README, capped at 400 chars
function extractReadmeSummary(readme: string | null): string {
  if (!readme) return '';
  const lines = readme.split('\n').map((l) => l.trim());
  const paragraphLines: string[] = [];
  let inPara = false;
  for (const line of lines) {
    if (line.startsWith('#')) {
      if (inPara) break;
      continue;
    }
    if (line.length > 10) {
      inPara = true;
      paragraphLines.push(line);
      if (paragraphLines.join(' ').length >= 400) break;
    }
  }
  const summary = paragraphLines.join(' ').slice(0, 400);
  return summary.length < 20 ? 'No description extracted from README.' : summary;
}

export function classifyRepository(opts: {
  name: string;
  description: string | null;
  topics: string[];
  languages: Record<string, number>;
  readme: string | null;
}): ClassificationResult {
  const { name, description, topics, languages, readme } = opts;

  const nameLower = name.toLowerCase();
  const descLower = (description || '').toLowerCase();
  const topicsLower = topics.map((t) => t.toLowerCase());
  const langKeys = Object.keys(languages);
  const readmeLower = (readme || '').toLowerCase();

  const scores: Array<{ rule: typeof CATEGORY_RULES[0]; score: number }> = [];

  for (const rule of CATEGORY_RULES) {
    let score = 0;

    // Topic matches (highest signal)
    for (const kw of rule.topicKeywords) {
      if (topicsLower.some((t) => t.includes(kw))) score += 3 * rule.weight;
    }

    // Language matches
    for (const lang of rule.languageKeywords) {
      if (langKeys.includes(lang)) score += 2 * rule.weight;
    }

    // Repo name matches
    for (const kw of rule.nameKeywords) {
      if (nameLower.includes(kw)) score += 2 * rule.weight;
    }

    // Description matches
    for (const kw of rule.topicKeywords) {
      if (descLower.includes(kw)) score += 1 * rule.weight;
    }

    // README matches
    for (const kw of rule.topicKeywords) {
      if (readmeLower.includes(kw)) score += 0.5 * rule.weight;
    }

    if (score > 0) scores.push({ rule, score });
  }

  scores.sort((a, b) => b.score - a.score);

  const readmeSummary = extractReadmeSummary(readme);

  if (scores.length === 0) {
    return {
      suggestedCategorySlug: 'research-and-experiments',
      suggestedSubcategory: 'Uncategorized / Exploratory',
      suggestedSkills: [],
      confidenceScore: 0.1,
      classificationNotes: 'No strong signal detected. Defaulted to research-and-experiments.',
      readmeSummary,
    };
  }

  const best = scores[0];
  const totalPossibleScore = best.rule.weight * (3 * best.rule.topicKeywords.length + 2 * best.rule.languageKeywords.length + 2 * best.rule.nameKeywords.length);
  const confidence = Math.min(1.0, best.score / Math.max(totalPossibleScore, 1));

  logger.debug('ClassificationEngine', `${name} → ${best.rule.categorySlug} (score: ${best.score.toFixed(1)}, confidence: ${confidence.toFixed(2)})`);

  return {
    suggestedCategorySlug: best.rule.categorySlug,
    suggestedSubcategory: best.rule.subcategory,
    suggestedSkills: best.rule.skillSlugs,
    confidenceScore: parseFloat(confidence.toFixed(2)),
    classificationNotes: `Matched by rules: topics(${topicsLower.join(', ')}) × languages(${langKeys.join(', ')}). Runner-up: ${scores[1]?.rule.categorySlug || 'none'} (${scores[1]?.score.toFixed(1) || 0}).`,
    readmeSummary,
  };
}

