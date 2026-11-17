/**
 * Classification Engine (pure, deterministic, no I/O)
 *
 * Turns repository evidence into: a primary category, secondary categories, subcategories,
 * technology tags, skill suggestions WITH evidence, a confidence score, a difficulty
 * suggestion from an explicit rubric, and live-link candidates.
 *
 * Design rules
 * - Whole-word matching only (no substring false positives).
 * - Structured evidence (GitHub topics, dependency manifests, repo name) outranks prose.
 *   Ambiguous everyday words only count from structured sources.
 * - Confidence reflects both strength of evidence and the margin over the runner-up.
 * - Results are SUGGESTIONS. Nothing here publishes anything.
 * - Difficulty never counts README wording; only observable engineering evidence.
 */

import { buildGrams, matchTerms } from '@/lib/text/terms';
import { SKILL_CATALOG, LANGUAGE_SKILLS } from '@/lib/skills/catalog';
import { extractReadmeSummary, extractLiveUrls, type LiveUrlCandidate } from './readmeText';

export { extractReadmeSummary };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassifyInput {
  name: string;
  description: string | null;
  topics: string[];
  /** GitHub language -> bytes */
  languages: Record<string, number>;
  readme: string | null;
  /** Root manifest files (package.json, requirements.txt, package.xml ...) -> text */
  manifests?: Record<string, string>;
  /** Repository file paths, or null/undefined when the tree could not be read. */
  tree?: string[] | null;
  homepage?: string | null;
}

export interface SkillSuggestion {
  slug: string;
  name: string;
  domain: string;
  category: string;
  confidence: number;
  evidence: string[];
}

export type DifficultyLevel = 'Foundational' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Research-oriented';

export interface DifficultyAssessment {
  level: DifficultyLevel;
  score: number;
  evidence: string[];
}

export interface ClassificationResult {
  suggestedCategorySlug: string;
  suggestedSubcategory: string;
  secondaryCategories: string[];
  subcategories: string[];
  suggestedSkills: string[];               // slugs (backwards compatible)
  skillSuggestions: SkillSuggestion[];     // with evidence
  technologyTags: string[];
  confidenceScore: number;                 // 0..1
  needsReview: boolean;
  classificationNotes: string;
  readmeSummary: string;
  difficulty: DifficultyAssessment;
  liveUrlCandidates: LiveUrlCandidate[];
}

// ---------------------------------------------------------------------------
// Category rules
// ---------------------------------------------------------------------------

interface SubRule { name: string; terms: string[]; structured?: string[] }
interface CategoryRule {
  slug: string;
  terms: string[];
  structured?: string[];
  languages?: string[];
  subs: SubRule[];
}

const RULES: CategoryRule[] = [
  {
    slug: 'robotics',
    terms: ['ros', 'ros2', 'ros 2', 'rclpy', 'rclcpp', 'ament', 'catkin', 'colcon', 'slam', 'gazebo', 'rviz', 'lidar', 'odometry', 'nav2',
      'robot', 'robotics', 'robotic', 'urdf', 'quadcopter', 'manipulator', 'kinematics', 'webots', 'pybullet', 'mujoco'],
    structured: ['navigation'],
    languages: ['C++', 'Python', 'CMake'],
    subs: [
      { name: 'ROS 2', terms: ['ros', 'ros2', 'ros 2', 'rclpy', 'rclcpp', 'ament', 'colcon', 'catkin'] },
      { name: 'SLAM', terms: ['slam', 'gmapping', 'cartographer', 'orb slam'] },
      { name: 'Autonomous Navigation', terms: ['nav2', 'path planning', 'motion planning', 'obstacle avoidance'], structured: ['navigation'] },
      { name: 'Simulation', terms: ['gazebo', 'webots', 'pybullet', 'mujoco', 'rviz'] },
      { name: 'Control Systems', terms: ['kalman', 'control system', 'control systems'], structured: ['pid', 'mpc'] },
      { name: 'Robot Vision', terms: ['opencv', 'computer vision', 'object detection'] },
      { name: 'Embedded Robotics', terms: ['arduino', 'esp32', 'stm32', 'microcontroller'] },
    ],
  },
  {
    slug: 'artificial-intelligence',
    terms: ['llm', 'llms', 'generative ai', 'gpt', 'langchain', 'chatbot', 'nlp', 'natural language processing', 'openai', 'gemini',
      'rag', 'reinforcement learning', 'ai agent', 'ai agents'],
    structured: ['ai', 'transformers', 'agent', 'agents'],
    languages: ['Python'],
    subs: [
      { name: 'Generative AI / LLMs', terms: ['llm', 'llms', 'generative ai', 'gpt', 'langchain', 'openai', 'gemini', 'rag', 'chatbot'] },
      { name: 'NLP', terms: ['nlp', 'natural language processing', 'spacy', 'nltk', 'bert'], structured: ['transformers'] },
      { name: 'Reinforcement Learning', terms: ['reinforcement learning', 'gymnasium', 'q learning'], structured: ['rl', 'gym'] },
      { name: 'AI Agents', terms: ['ai agent', 'ai agents'], structured: ['agent', 'agents'] },
    ],
  },
  {
    slug: 'machine-learning',
    terms: ['machine learning', 'deep learning', 'neural network', 'neural networks', 'pytorch', 'tensorflow', 'keras', 'scikit learn',
      'sklearn', 'xgboost', 'opencv', 'computer vision', 'yolo', 'pandas', 'numpy', 'jupyter', 'cnn', 'lstm', 'data science'],
    structured: ['ml', 'classification', 'regression', 'dataset'],
    languages: ['Jupyter Notebook', 'Python'],
    subs: [
      { name: 'Deep Learning', terms: ['deep learning', 'neural network', 'neural networks', 'pytorch', 'tensorflow', 'keras', 'cnn', 'lstm'] },
      { name: 'Computer Vision', terms: ['computer vision', 'opencv', 'yolo', 'object detection', 'image segmentation'] },
      { name: 'Classical ML', terms: ['machine learning', 'scikit learn', 'sklearn', 'xgboost'], structured: ['classification', 'regression'] },
      { name: 'Data Analysis', terms: ['pandas', 'numpy', 'matplotlib', 'jupyter', 'data analysis', 'data science'] },
    ],
  },
  {
    slug: 'cybersecurity',
    terms: ['cybersecurity', 'infosec', 'ctf', 'pentest', 'penetration testing', 'exploit', 'owasp', 'cryptography', 'encryption', 'cipher',
      'malware', 'nmap', 'wireshark', 'xss', 'sql injection'],
    structured: ['security', 'vulnerability'],
    languages: [],
    subs: [
      { name: 'Cryptography', terms: ['cryptography', 'encryption', 'cipher', 'aes', 'rsa'] },
      { name: 'Network Security', terms: ['nmap', 'wireshark', 'packet', 'scapy', 'firewall'] },
      { name: 'Application Security', terms: ['owasp', 'xss', 'sql injection'], structured: ['vulnerability'] },
      { name: 'Capture the Flag', terms: ['ctf'] },
    ],
  },
  {
    slug: 'frontend-development',
    terms: ['nextjs', 'next js', 'reactjs', 'react js', 'vue', 'vuejs', 'angular', 'svelte', 'tailwind', 'tailwindcss', 'frontend', 'front end',
      'webgl', 'threejs', 'three js', 'react three fiber', 'css', 'html', 'responsive', 'landing page'],
    structured: ['react', 'next', 'three', 'ui', 'r3f'],
    languages: ['TypeScript', 'JavaScript', 'CSS', 'HTML'],
    subs: [
      { name: 'Next.js', terms: ['nextjs', 'next js'], structured: ['next'] },
      { name: 'React', terms: ['reactjs', 'react js'], structured: ['react'] },
      { name: 'Three.js / WebGL', terms: ['webgl', 'threejs', 'three js', 'react three fiber'], structured: ['three', 'r3f'] },
      { name: 'TypeScript', terms: ['typescript'] },
      { name: 'UI Engineering', terms: ['tailwind', 'tailwindcss', 'css', 'responsive'], structured: ['ui'] },
      { name: 'HTML / CSS / JavaScript', terms: ['html', 'css', 'javascript'] },
    ],
  },
  {
    slug: 'backend-development',
    terms: ['backend', 'back end', 'restful', 'graphql', 'microservice', 'microservices', 'fastapi', 'flask', 'django', 'prisma', 'postgresql',
      'postgres', 'mongodb', 'mysql', 'sqlite', 'jwt', 'oauth', 'authentication', 'server side', 'nestjs', 'kafka', 'rabbitmq', 'redis'],
    structured: ['api', 'rest', 'express', 'auth', 'server', 'database'],
    languages: ['Go', 'Rust', 'Java', 'Python', 'PHP'],
    subs: [
      { name: 'APIs', terms: ['restful', 'graphql', 'openapi', 'fastapi', 'flask', 'django'], structured: ['api', 'rest'] },
      { name: 'Databases', terms: ['prisma', 'postgresql', 'postgres', 'mongodb', 'mysql', 'sqlite', 'redis'], structured: ['database'] },
      { name: 'Authentication', terms: ['jwt', 'oauth', 'authentication', 'bcrypt', 'next auth'], structured: ['auth'] },
      { name: 'Distributed Systems', terms: ['microservice', 'microservices', 'kafka', 'rabbitmq', 'distributed systems'] },
    ],
  },
  {
    slug: 'full-stack-development',
    terms: ['fullstack', 'full stack', 'mern', 'mean stack'],
    languages: [],
    subs: [{ name: 'Full-Stack Web Applications', terms: ['fullstack', 'full stack', 'mern'] }],
  },
  {
    slug: 'cloud-and-devops',
    terms: ['docker', 'dockerfile', 'docker compose', 'kubernetes', 'terraform', 'ansible', 'aws', 'gcp', 'azure', 'github actions', 'ci cd',
      'devops', 'helm', 'jenkins', 'vercel'],
    structured: ['ci', 'deploy', 'render', 'container'],
    languages: ['HCL', 'Dockerfile'],
    subs: [
      { name: 'Containers', terms: ['docker', 'dockerfile', 'docker compose', 'kubernetes', 'helm'], structured: ['container'] },
      { name: 'CI/CD', terms: ['github actions', 'ci cd', 'jenkins'], structured: ['ci'] },
      { name: 'Infrastructure as Code', terms: ['terraform', 'ansible'] },
      { name: 'Cloud Platforms', terms: ['aws', 'gcp', 'azure', 'vercel'], structured: ['render'] },
    ],
  },
  {
    slug: 'automation',
    terms: ['automation', 'scraper', 'scraping', 'web scraping', 'selenium', 'puppeteer', 'cron', 'workflow automation', 'telegram bot', 'discord bot'],
    structured: ['bot', 'bots', 'script', 'scheduler'],
    languages: [],
    subs: [
      { name: 'Web Automation', terms: ['selenium', 'puppeteer', 'scraper', 'scraping', 'web scraping'] },
      { name: 'Bots', terms: ['telegram bot', 'discord bot'], structured: ['bot', 'bots'] },
      { name: 'Scripting', terms: ['automation', 'cron'], structured: ['script', 'scheduler'] },
    ],
  },
  {
    slug: 'computer-science',
    terms: ['data structures', 'algorithms', 'dsa', 'leetcode', 'competitive programming', 'codeforces', 'geeksforgeeks', 'operating system',
      'operating systems', 'compiler', 'linked list', 'binary tree', 'dynamic programming'],
    structured: ['algorithm'],
    languages: [],
    subs: [
      { name: 'Data Structures and Algorithms', terms: ['data structures', 'algorithms', 'dsa', 'linked list', 'binary tree', 'dynamic programming'], structured: ['algorithm'] },
      { name: 'Competitive Programming', terms: ['competitive programming', 'leetcode', 'codeforces', 'geeksforgeeks'] },
      { name: 'Systems Programming', terms: ['operating system', 'operating systems', 'compiler'] },
    ],
  },
  {
    slug: 'electronics-embedded',
    terms: ['arduino', 'esp32', 'esp8266', 'stm32', 'raspberry pi', 'microcontroller', 'firmware', 'platformio', 'iot', 'mqtt', 'embedded',
      'sensor', 'sensors'],
    languages: [],
    subs: [
      { name: 'Microcontrollers', terms: ['arduino', 'esp32', 'esp8266', 'stm32', 'microcontroller', 'firmware', 'platformio'] },
      { name: 'IoT', terms: ['iot', 'mqtt', 'internet of things'] },
    ],
  },
  {
    slug: 'research-and-experiments',
    terms: ['research', 'experiment', 'experiments', 'proof of concept', 'thesis', 'benchmark', 'prototype'],
    structured: ['poc', 'paper'],
    languages: [],
    subs: [{ name: 'Research Prototype', terms: ['research', 'experiment', 'experiments', 'proof of concept', 'thesis', 'prototype'], structured: ['poc'] }],
  },
];

// ---------------------------------------------------------------------------
// Evidence helpers
// ---------------------------------------------------------------------------

interface Ctx {
  topics: Set<string>;
  name: Set<string>;
  desc: Set<string>;
  readme: Set<string>;
  manifest: Set<string>;
  languages: Record<string, number>;
  significantLangs: Set<string>;
}

const CAPS = { topic: 12, manifest: 12, name: 4, desc: 6, readme: 5 } as const;
const PTS = { topic: 3, manifest: 3, name: 2, desc: 2, readme: 1 } as const;

function buildCtx(input: ClassifyInput): Ctx {
  const manifestText = Object.values(input.manifests ?? {}).join('\n').slice(0, 60000);
  const total = Object.values(input.languages).reduce((a, b) => a + b, 0);
  const significant = new Set<string>();
  for (const [lang, bytes] of Object.entries(input.languages)) {
    if (total > 0 && (bytes / total >= 0.1 || bytes >= 5000)) significant.add(lang);
  }
  return {
    topics: buildGrams(input.topics.join(' ')),
    name: buildGrams(input.name),
    desc: buildGrams(input.description ?? ''),
    readme: buildGrams((input.readme ?? '').slice(0, 40000)),
    manifest: buildGrams(manifestText),
    languages: input.languages,
    significantLangs: significant,
  };
}

interface Scored { score: number; evidence: string[]; sources: Set<string> }

function scoreTerms(ctx: Ctx, terms: readonly string[], structured: readonly string[] = []): Scored {
  const evidence: string[] = [];
  const sources = new Set<string>();
  let score = 0;
  const add = (src: keyof typeof CAPS, label: string, hits: string[]) => {
    if (!hits.length) return;
    const pts = Math.min(CAPS[src], hits.length * PTS[src]);
    score += pts;
    sources.add(src);
    evidence.push(`${label}: ${hits.slice(0, 4).join(', ')}`);
  };
  const all = [...terms, ...structured];
  add('topic', 'topic', matchTerms(ctx.topics, all));
  add('manifest', 'dependency/manifest', matchTerms(ctx.manifest, all));
  add('name', 'repo name', matchTerms(ctx.name, all));
  add('desc', 'description', matchTerms(ctx.desc, terms));
  add('readme', 'README', matchTerms(ctx.readme, terms));
  return { score, evidence, sources };
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

function detectSkills(ctx: Ctx): SkillSuggestion[] {
  const out: SkillSuggestion[] = [];
  const totalBytes = Object.values(ctx.languages).reduce((a, b) => a + b, 0);
  for (const skill of SKILL_CATALOG) {
    const r = scoreTerms(ctx, skill.terms, skill.structured ?? []);
    let score = r.score;
    const evidence = [...r.evidence];
    for (const lang of Array.from(ctx.significantLangs)) {
      if (LANGUAGE_SKILLS[lang] === skill.slug) {
        score += 4;
        evidence.push(`language: ${lang} (${totalBytes ? Math.round(((ctx.languages[lang] ?? 0) / totalBytes) * 100) : 0}% of code)`);
      }
    }
    if (score < 3) continue;
    out.push({
      slug: skill.slug,
      name: skill.name,
      domain: skill.domain,
      category: skill.category,
      // Detection confidence only: how sure we are the technology is used, NOT proficiency.
      confidence: Math.min(0.9, parseFloat((0.3 + 0.07 * score).toFixed(2))),
      evidence,
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 12);
}

// ---------------------------------------------------------------------------
// Difficulty rubric
// ---------------------------------------------------------------------------

const CODE_EXT = /\.(c|cc|cpp|h|hpp|py|js|jsx|ts|tsx|java|go|rs|rb|php|cs|kt|swift|ino|launch|urdf)$/i;
const IGNORED_DIR = /(^|\/)(node_modules|dist|build|\.next|vendor|\.git|__pycache__|venv|\.venv)\//;

export function assessComplexity(input: ClassifyInput): DifficultyAssessment {
  const evidence: string[] = [];
  let score = 0;
  const total = Object.values(input.languages).reduce((a, b) => a + b, 0);

  if (total >= 500_000) { score += 3; evidence.push(`Large codebase (~${Math.round(total / 1000)} KB)`); }
  else if (total >= 100_000) { score += 2; evidence.push(`Substantial codebase (~${Math.round(total / 1000)} KB)`); }
  else if (total >= 20_000) { score += 1; evidence.push(`Moderate codebase (~${Math.round(total / 1000)} KB)`); }
  else evidence.push(`Small codebase (~${Math.round(total / 1000)} KB)`);

  const sigLangs = Object.entries(input.languages).filter(([, b]) => total > 0 && (b / total >= 0.1 || b >= 5000)).map(([l]) => l);
  if (sigLangs.length >= 3) { score += 2; evidence.push(`Multiple languages (${sigLangs.join(', ')})`); }
  else if (sigLangs.length === 2) { score += 1; evidence.push(`Two languages (${sigLangs.join(', ')})`); }

  const treeKnown = Array.isArray(input.tree);
  const files = (input.tree ?? []).filter((p) => !IGNORED_DIR.test(p + '/'));
  if (treeKnown) {
    const has = (re: RegExp) => files.some((p) => re.test(p));
    if (has(/(^|\/)(tests?|__tests__|spec)\//i) || has(/\.(test|spec)\.[jt]sx?$/) || has(/(^|\/)test_[^/]+\.(py|ts|js)$/)) { score += 2; evidence.push('Automated tests present'); }
    if (has(/^\.github\/workflows\//)) { score += 1; evidence.push('CI workflow configured'); }
    if (has(/(^|\/)(Dockerfile|docker-compose\.ya?ml|render\.yaml|vercel\.json|Procfile|fly\.toml|netlify\.toml)$/)) { score += 1; evidence.push('Deployment configuration present'); }
    if (has(/(^|\/)(docs?|documentation)\//i) || has(/(^|\/)(ARCHITECTURE|DESIGN)\.md$/i)) { score += 1; evidence.push('Design/architecture documentation'); }
    if (has(/(^|\/)prisma\/schema\.prisma$/) || has(/(^|\/)migrations?\//i) || has(/\.sql$/)) { score += 1; evidence.push('Database schema/migrations'); }
    const codeFiles = files.filter((p) => CODE_EXT.test(p));
    if (codeFiles.length >= 200) { score += 2; evidence.push(`${codeFiles.length} source files`); }
    else if (codeFiles.length >= 50) { score += 1; evidence.push(`${codeFiles.length} source files`); }
    const topDirs = new Set(codeFiles.map((p) => p.split('/')[0]).filter((seg) => seg.includes('.') === false && !/^(tests?|docs?|scripts|\.github)$/i.test(seg)));
    if (topDirs.size >= 3) { score += 1; evidence.push(`Modular layout (${topDirs.size} source directories)`); }
  } else {
    evidence.push('File tree unavailable: structural evidence (tests, CI, modules) not assessed');
  }
  if (input.homepage && /^https?:\/\//i.test(input.homepage)) { score += 1; evidence.push('Public deployment linked'); }

  let level: DifficultyLevel = score >= 7 ? 'Advanced' : score >= 4 ? 'Intermediate' : score >= 2 ? 'Beginner' : 'Foundational';
  if (!treeKnown && level === 'Advanced') level = 'Intermediate'; // not enough evidence to claim Advanced

  // Research-oriented: research methodology signals AND real engineering substance.
  const ctx = buildCtx(input);
  const research = matchTerms(ctx.topics, ['research', 'paper', 'thesis', 'experiment', 'experiments']).length
    + matchTerms(ctx.name, ['research', 'thesis', 'experiment']).length
    + matchTerms(ctx.desc, ['research', 'thesis', 'experiment', 'experiments']).length;
  const method = files.some((p) => /\.ipynb$/.test(p)) || matchTerms(ctx.readme, ['evaluation', 'benchmark', 'dataset', 'results']).length >= 2;
  if (research >= 2 && method && score >= 4) {
    level = 'Research-oriented';
    evidence.push('Research signals in topics/name/description plus methodology (notebooks/evaluation)');
  }
  return { level, score, evidence };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function classifyRepository(input: ClassifyInput): ClassificationResult {
  const ctx = buildCtx(input);
  const readmeSummary = extractReadmeSummary(input.readme);
  const skillSuggestions = detectSkills(ctx);
  const difficulty = assessComplexity(input);
  const liveUrlCandidates = extractLiveUrls(input.homepage ?? null, input.readme);

  // Score every category.
  const scored = RULES.map((rule, idx) => {
    const base = scoreTerms(ctx, rule.terms, rule.structured ?? []);
    let score = base.score;
    const evidence = [...base.evidence];
    if (score > 0) {
      const langHits = (rule.languages ?? []).filter((l) => ctx.significantLangs.has(l));
      if (langHits.length) { score += Math.min(2, langHits.length); evidence.push(`language: ${langHits.join(', ')}`); }
    }
    return { rule, idx, score, evidence, sources: base.sources };
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.idx - b.idx);

  // Full-stack: genuine frontend AND backend evidence.
  const byslug = new Map(scored.map((s) => [s.rule.slug, s]));
  const fe = byslug.get('frontend-development')?.score ?? 0;
  const be = byslug.get('backend-development')?.score ?? 0;
  const fs = byslug.get('full-stack-development');
  const topSlug = scored[0]?.rule.slug;
  const feBeLead = topSlug === 'frontend-development' || topSlug === 'backend-development' || topSlug === 'full-stack-development';
  let primary = scored[0];
  let forcedFullStack = false;
  if (feBeLead && ((fe >= 6 && be >= 6) || (fs && fs.score >= 3))) {
    const base = fs ?? { rule: RULES.find((r) => r.slug === 'full-stack-development')!, idx: 99, score: 0, evidence: [], sources: new Set<string>() };
    primary = {
      ...base,
      score: Math.max(fe, be) + base.score,
      evidence: [`frontend and backend evidence both present (frontend ${fe}, backend ${be})`, ...base.evidence],
      sources: new Set<string>([
        ...Array.from(base.sources),
        ...Array.from(byslug.get('frontend-development')?.sources ?? new Set<string>()),
        ...Array.from(byslug.get('backend-development')?.sources ?? new Set<string>()),
      ]),
    };
    forcedFullStack = true;
  }

  if (!primary || primary.score < 4) {
    return {
      suggestedCategorySlug: 'research-and-experiments',
      suggestedSubcategory: 'Unclassified',
      secondaryCategories: [],
      subcategories: [],
      suggestedSkills: skillSuggestions.map((s) => s.slug),
      skillSuggestions,
      technologyTags: skillSuggestions.map((s) => s.name).slice(0, 12),
      confidenceScore: 0.1,
      needsReview: true,
      classificationNotes: 'No strong signal in topics, dependencies, name, description or README. Needs owner classification.',
      readmeSummary,
      difficulty,
      liveUrlCandidates,
    };
  }

  // Subcategories: best-scoring sub-rules within the primary (and for full-stack, within FE/BE).
  const subPool = forcedFullStack
    ? [...(RULES.find((r) => r.slug === 'frontend-development')?.subs ?? []), ...(RULES.find((r) => r.slug === 'backend-development')?.subs ?? [])]
    : primary.rule.subs;
  const subScores = subPool
    .map((s) => ({ name: s.name, score: scoreTerms(ctx, s.terms, s.structured ?? []).score }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const subcategories = subScores.slice(0, 3).map((s) => s.name);
  const suggestedSubcategory = forcedFullStack ? 'Full-Stack Web Applications' : subcategories[0] ?? primary.rule.subs[0]?.name ?? 'General';

  // Confidence: strength of evidence combined with margin over the runner-up.
  const runnerUp = scored.find((s) => s.rule.slug !== primary.rule.slug && !(forcedFullStack && ['frontend-development', 'backend-development'].includes(s.rule.slug)));
  const strength = Math.min(1, primary.score / 16);
  const margin = runnerUp ? Math.max(0, (primary.score - runnerUp.score) / primary.score) : 1;
  let confidence = 0.65 * strength + 0.35 * margin;
  if (primary.sources.size <= 1) confidence = Math.min(confidence, 0.55); // single-source evidence is weak
  confidence = parseFloat(Math.max(0.1, Math.min(0.95, confidence)).toFixed(2));

  const secondaryCategories = scored
    .filter((s) => s.rule.slug !== primary.rule.slug && !(forcedFullStack && ['frontend-development', 'backend-development'].includes(s.rule.slug) && false) && s.score >= Math.max(4, primary.score * 0.4))
    .slice(0, 3)
    .map((s) => s.rule.slug);

  return {
    suggestedCategorySlug: primary.rule.slug,
    suggestedSubcategory,
    secondaryCategories,
    subcategories,
    suggestedSkills: skillSuggestions.map((s) => s.slug),
    skillSuggestions,
    technologyTags: skillSuggestions.map((s) => s.name).slice(0, 12),
    confidenceScore: confidence,
    needsReview: confidence < 0.6,
    classificationNotes: `Primary: ${primary.rule.slug} (score ${primary.score.toFixed(0)}). Evidence: ${primary.evidence.join('; ')}.${runnerUp ? ` Runner-up: ${runnerUp.rule.slug} (${runnerUp.score.toFixed(0)}).` : ''}`,
    readmeSummary,
    difficulty,
    liveUrlCandidates,
  };
}
