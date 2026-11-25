/**
 * Settings of the private job agent. Nothing here is secret and none of it is shown on the public site.
 * The phone number is NOT stored here: set OWNER_PHONE as a secret (.dev.vars / Cloudflare secret).
 * The remote / on-site / hybrid switch and the letter template are changed in Admin -> Job Agent, not in this file.
 */
export type WorkMode = 'remote' | 'onsite' | 'hybrid';

export const JOB_CONFIG = {
  mode: 'remote' as WorkMode,          // 2026-2028: work from home in Kolkata. Switch in the admin panel any time.
  limits: { dailyCap: 8, minMatch: 85, priorityMatch: 90, dedupeDays: 90, minCompanyRating: 4.5, ratingWaivedForStartups: true, ratingPolicy: 'flag_unknown' as 'flag_unknown' | 'skip_unknown', maxBoardsPerScan: 40 },
  owner: {
    city: 'Kolkata, West Bengal, India',
    status: 'Student, B.Tech CSE (AI & ML), Semester 5, graduating 2028. No full-time experience.',
    workAuthorisation: 'Indian citizen. Not currently employed.',
    availability: 'Immediate for part-time remote internships; Summer 2027 (May-July) or university breaks for full-time on-site internships',
    graduationYear: 2028,
  },
  countries: ['india', 'germany', 'japan', 'switzerland', 'netherlands', 'sweden', 'denmark', 'norway', 'finland', 'ireland', 'france', 'austria', 'belgium', 'spain', 'portugal', 'poland', 'estonia', 'luxembourg', 'united kingdom'],
  internTitles: ['intern', 'internship', 'trainee', 'student', 'apprentice', 'working student', 'werkstudent', 'praktikum'],
  families: {
    ai_robotics: { resume: 'AI, Machine Learning & Robotics resume', titleWords: ['machine learning', 'ml ', 'ai ', 'deep learning', 'embodied', 'robotics', 'research', 'nlp', 'generative', 'llm', 'computer vision', 'reinforcement'] },
    systems_security: { resume: 'Systems, C++ & Cybersecurity resume', titleWords: ['software engineer', 'backend', 'systems', 'c++', 'security', 'cyber', 'infrastructure', 'platform', 'embedded'] },
  } as Record<string, { resume: string; titleWords: string[] }>,
  skills: {
    core: ['python', 'pytorch', 'machine learning', 'deep learning', 'robotics', 'ros', 'flow matching', 'nlp', 'ner', 'generative ai', 'llm', 'c++', 'linux', 'cryptography', 'cybersecurity', 'backend', 'typescript', 'next.js', 'sql', 'computer vision'],
    adjacent: ['tensorflow', 'docker', 'git', 'rest', 'api', 'algorithms', 'data structures', 'numpy', 'pandas', 'transformers'],
  },
  evidence: [
    { name: 'AWAM', tags: ['robotics', 'flow matching', 'bimanual', 'embodied', 'deep learning', 'research'], line: 'Bimanual flow-matching research (AWAM)' },
    { name: 'NeuroAssist-NER', tags: ['nlp', 'ner', 'transformers', 'machine learning'], line: 'NeuroAssist-NER (NLP)' },
    { name: 'PinnFlow', tags: ['deep learning', 'pytorch', 'physics', 'machine learning'], line: 'PinnFlow' },
    { name: 'NotesMakerAI', tags: ['generative ai', 'llm', 'nlp', 'typescript'], line: 'NotesMakerAI (generative AI)' },
    { name: 'Project Shadow-Net', tags: ['security', 'cybersecurity', 'linux', 'c++', 'systems', 'networking'], line: 'Project Shadow-Net (security / systems)' },
    { name: 'CS50 Cybersecurity + cryptography', tags: ['cryptography', 'security', 'cybersecurity'], line: 'Cryptography and CS50 Cybersecurity coursework' },
  ],
};

/**
 * Where to look: the public job-board APIs that Greenhouse, Lever and Ashby publish for exactly this purpose.
 * Add the big companies you want (token = the slug in their job-board URL). Fill in `rating` (Glassdoor) yourself:
 * the agent never guesses a rating. `startup: true` waives the rating filter. A wrong token is harmless: the panel shows
 * "404" for that company so you can fix it. These are STARTING EXAMPLES; confirm each one.
 */
export interface BoardEntry { name: string; token: string; ats: 'greenhouse' | 'lever' | 'ashby'; rating?: number; startup?: boolean }
export const JOB_BOARDS: BoardEntry[] = [
  { name: 'Anthropic', token: 'anthropic', ats: 'greenhouse' },
  { name: 'Figma', token: 'figma', ats: 'greenhouse' },
  { name: 'Palantir', token: 'palantir', ats: 'lever' },
  { name: 'OpenAI', token: 'openai', ats: 'ashby' },
];
