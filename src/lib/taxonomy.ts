/**
 * Project taxonomy: one source of truth for categories and subcategories.
 *
 * Used by the seed, by the sync pipeline (ensureTaxonomy) and by the classifier, so a
 * suggested category slug always exists in the database. Idempotent: safe to call many times.
 */
import type { PrismaClient } from '@prisma/client';

export interface TaxonomyNode {
  slug: string;
  name: string;
  description: string;
  icon: string;
  children: { slug: string; name: string }[];
}

export const TAXONOMY: TaxonomyNode[] = [
  {
    slug: 'robotics', name: 'Robotics', icon: 'Cpu',
    description: 'Robot software, ROS 2, SLAM, navigation, simulation and control.',
    children: [
      { slug: 'robotics-ros2', name: 'ROS 2' },
      { slug: 'robotics-slam', name: 'SLAM' },
      { slug: 'robotics-navigation', name: 'Autonomous Navigation' },
      { slug: 'robotics-vision', name: 'Robot Vision' },
      { slug: 'robotics-simulation', name: 'Simulation' },
      { slug: 'robotics-control', name: 'Control Systems' },
      { slug: 'robotics-embedded', name: 'Embedded Robotics' },
    ],
  },
  {
    slug: 'artificial-intelligence', name: 'Artificial Intelligence', icon: 'Brain',
    description: 'Generative AI, language models, agents and reinforcement learning.',
    children: [
      { slug: 'ai-generative', name: 'Generative AI / LLMs' },
      { slug: 'ai-nlp', name: 'NLP' },
      { slug: 'ai-reinforcement', name: 'Reinforcement Learning' },
      { slug: 'ai-agents', name: 'AI Agents' },
    ],
  },
  {
    slug: 'machine-learning', name: 'Machine Learning', icon: 'LineChart',
    description: 'Statistical learning, deep learning, computer vision and data analysis.',
    children: [
      { slug: 'ml-classical', name: 'Classical ML' },
      { slug: 'ml-deep-learning', name: 'Deep Learning' },
      { slug: 'ml-computer-vision', name: 'Computer Vision' },
      { slug: 'ml-data-analysis', name: 'Data Analysis' },
    ],
  },
  {
    slug: 'cybersecurity', name: 'Cybersecurity', icon: 'Shield',
    description: 'Application and network security, cryptography and vulnerability analysis.',
    children: [
      { slug: 'security-cryptography', name: 'Cryptography' },
      { slug: 'security-network', name: 'Network Security' },
      { slug: 'security-appsec', name: 'Application Security' },
      { slug: 'security-ctf', name: 'Capture the Flag' },
    ],
  },
  {
    slug: 'frontend-development', name: 'Frontend Development', icon: 'Layout',
    description: 'User interfaces and interactive web experiences.',
    children: [
      { slug: 'frontend-react', name: 'React' },
      { slug: 'frontend-nextjs', name: 'Next.js' },
      { slug: 'frontend-threejs', name: 'Three.js / WebGL' },
      { slug: 'frontend-ui', name: 'UI Engineering' },
      { slug: 'frontend-vanilla', name: 'HTML / CSS / JavaScript' },
    ],
  },
  {
    slug: 'backend-development', name: 'Backend Development', icon: 'Server',
    description: 'APIs, databases, authentication and server-side systems.',
    children: [
      { slug: 'backend-apis', name: 'APIs' },
      { slug: 'backend-databases', name: 'Databases' },
      { slug: 'backend-auth', name: 'Authentication' },
      { slug: 'backend-distributed', name: 'Distributed Systems' },
    ],
  },
  {
    slug: 'full-stack-development', name: 'Full Stack Development', icon: 'Layers',
    description: 'End-to-end applications spanning interface, server and data.',
    children: [{ slug: 'fullstack-web', name: 'Full-Stack Web Applications' }],
  },
  {
    slug: 'cloud-and-devops', name: 'Cloud and DevOps', icon: 'Cloud',
    description: 'Containers, CI/CD, infrastructure and deployment.',
    children: [
      { slug: 'devops-containers', name: 'Containers' },
      { slug: 'devops-cicd', name: 'CI/CD' },
      { slug: 'devops-iac', name: 'Infrastructure as Code' },
      { slug: 'devops-cloud', name: 'Cloud Platforms' },
    ],
  },
  {
    slug: 'automation', name: 'Automation', icon: 'Zap',
    description: 'Bots, scrapers, scheduled jobs and workflow automation.',
    children: [
      { slug: 'automation-web', name: 'Web Automation' },
      { slug: 'automation-bots', name: 'Bots' },
      { slug: 'automation-scripting', name: 'Scripting' },
    ],
  },
  {
    slug: 'computer-science', name: 'Computer Science', icon: 'Layers',
    description: 'Algorithms, data structures, systems programming and competitive programming.',
    children: [
      { slug: 'cs-dsa', name: 'Data Structures and Algorithms' },
      { slug: 'cs-competitive', name: 'Competitive Programming' },
      { slug: 'cs-systems', name: 'Systems Programming' },
    ],
  },
  {
    slug: 'electronics-embedded', name: 'Electronics and Embedded Systems', icon: 'Cpu',
    description: 'Microcontrollers, IoT, firmware and hardware interfacing.',
    children: [
      { slug: 'embedded-mcu', name: 'Microcontrollers' },
      { slug: 'embedded-iot', name: 'IoT' },
    ],
  },
  {
    slug: 'research-and-experiments', name: 'Research and Experiments', icon: 'FlaskConical',
    description: 'Prototypes, experiments and exploratory work.',
    children: [{ slug: 'research-prototype', name: 'Research Prototype' }],
  },
];

export const CATEGORY_SLUGS = new Set(TAXONOMY.map((c) => c.slug));

let ensured = false;

/** Idempotently creates/updates the whole taxonomy. Never deletes anything. */
export async function ensureTaxonomy(db: PrismaClient, force = false): Promise<void> {
  if (ensured && !force) return;
  let order = 1;
  for (const node of TAXONOMY) {
    const parent = await db.projectCategory.upsert({
      where: { slug: node.slug },
      update: { name: node.name, description: node.description, icon: node.icon, orderIndex: order },
      create: { slug: node.slug, name: node.name, description: node.description, icon: node.icon, orderIndex: order },
    });
    let childOrder = 1;
    for (const child of node.children) {
      await db.projectCategory.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: parent.id, orderIndex: childOrder },
        create: { slug: child.slug, name: child.name, parentId: parent.id, orderIndex: childOrder },
      });
      childOrder++;
    }
    order++;
  }
  ensured = true;
}
