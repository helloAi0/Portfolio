/**
 * Database seed.
 *
 * Seeds ONLY facts the owner has supplied. It never invents projects, coding
 * statistics, certificates, posts, experience or integration status.
 *
 * Non-destructive by default: existing records are kept. Set SEED_RESET=true to
 * wipe content tables first (never do this against a production database).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database (owner-supplied facts only)...');

  if (process.env.SEED_RESET === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing SEED_RESET=true in production.');
    }
    console.log('SEED_RESET=true: clearing content tables.');
    await prisma.adminSession.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.visitorEnquiry.deleteMany();
    await prisma.syncLog.deleteMany();
    await prisma.integration.deleteMany();
    await prisma.codingPlatformProfile.deleteMany();
    await prisma.linkedinPost.deleteMany();
    await prisma.githubRepository.deleteMany();
    await prisma.projectSkill.deleteMany();
    await prisma.project.deleteMany();
    await prisma.projectCategory.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.education.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.achievement.deleteMany();
    await prisma.experience.deleteMany();
    await prisma.socialLink.deleteMany();
    await prisma.aiKnowledgeRecord.deleteMany();
  }

  // Profile (no date of birth is stored; age is derived from OWNER_BIRTH_DATE at runtime)
  if ((await prisma.profile.count()) === 0) {
    await prisma.profile.create({
      data: {
        displayName: 'Taha Udaipurwala',
        contactEmail: 'tahaudaipurwala68@gmail.com',
        headline: 'Aspiring AI/ML and Robotics Engineer',
        bio: 'B.Tech student in Computer Science and Engineering (AI & ML) with a minor in Cybersecurity, learning and building in robotics.',
        location: 'Kolkata, West Bengal, India',
        githubUrl: 'https://github.com/helloAi0',
        linkedinUrl: process.env.LINKEDIN_PROFILE_URL || null,
        identityVerificationStatus: 'PENDING_OWNER_CONFIRMATION',
      },
    });
  }

  // Admin user: the password MUST come from the environment. There is no default.
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  if (adminPassword && adminPassword.length >= 12) {
    const username = process.env.ADMIN_USERNAME || 'taha';
    const existing = await prisma.adminUser.findFirst({ where: { username } });
    if (!existing) {
      await prisma.adminUser.create({
        data: {
          username,
          email: 'tahaudaipurwala68@gmail.com',
          passwordHash: await bcrypt.hash(adminPassword, 12),
          role: 'SUPERADMIN',
        },
      });
      console.log(`Admin user "${username}" created.`);
    }
  } else {
    console.warn('ADMIN_DEFAULT_PASSWORD missing or shorter than 12 characters: no admin user created.');
  }

  // Education. Chronology of schools is NOT asserted: owner must verify it in the admin.
  if ((await prisma.education.count()) === 0) {
    const university = process.env.OWNER_INSTITUTION?.trim();
    await prisma.education.createMany({
      data: [
        {
          institution: university || 'B.Tech programme (institution to be confirmed by owner)',
          schoolType: 'HIGHER_EDUCATION',
          degree: 'B.Tech',
          field: 'Computer Science and Engineering (Artificial Intelligence and Machine Learning)',
          minor: 'Cybersecurity',
          additionalInterest: 'Robotics',
          startYear: 2024,
          endYear: 2028,
          isCurrent: true,
          graduationStatus: 'EXPECTED_2028',
          verificationStatus: university ? 'OWNER_CONFIRMED' : 'OWNER_REVIEW_REQUIRED',
          orderIndex: 1,
        },
        {
          institution: 'Saini Golden Jubilee High School',
          schoolType: 'HIGH_SCHOOL',
          graduationStatus: 'ATTENDED',
          verificationStatus: 'OWNER_REVIEW_REQUIRED',
          orderIndex: 2,
        },
        {
          institution: 'Nischintapur Public School',
          schoolType: 'HIGH_SCHOOL',
          graduationStatus: 'ATTENDED',
          verificationStatus: 'OWNER_REVIEW_REQUIRED',
          orderIndex: 3,
        },
      ],
    });
  }

  if ((await prisma.projectCategory.count()) === 0) {
    // 5. Seed Hierarchical Project Categories
    const catRobotics = await prisma.projectCategory.create({
      data: {
        slug: 'robotics',
        name: 'Robotics',
        description: 'Autonomous systems, ROS2 navigation, perception pipelines, and physical computing.',
        icon: 'Cpu',
        orderIndex: 1,
      },
    });

    const catAI = await prisma.projectCategory.create({
      data: {
        slug: 'artificial-intelligence',
        name: 'Artificial Intelligence',
        description: 'Neural networks, autonomous agents, and foundation model architectures.',
        icon: 'Brain',
        orderIndex: 2,
      },
    });

    const catML = await prisma.projectCategory.create({
      data: {
        slug: 'machine-learning',
        name: 'Machine Learning',
        description: 'Statistical learning, computer vision classifiers, and predictive algorithms.',
        icon: 'LineChart',
        orderIndex: 3,
      },
    });

    const catCybersecurity = await prisma.projectCategory.create({
      data: {
        slug: 'cybersecurity',
        name: 'Cybersecurity',
        description: 'Defensive architecture, network penetration defense, and cryptographic protocols.',
        icon: 'Shield',
        orderIndex: 4,
      },
    });

    const catFrontend = await prisma.projectCategory.create({
      data: {
        slug: 'frontend-development',
        name: 'Frontend Development',
        description: 'Monumental WebGL experiences, Next.js engineering, and reactive UI architecture.',
        icon: 'Layout',
        orderIndex: 5,
      },
    });

    const catBackend = await prisma.projectCategory.create({
      data: {
        slug: 'backend-development',
        name: 'Backend Development',
        description: 'Distributed microservices, resilient APIs, and transactional database engines.',
        icon: 'Server',
        orderIndex: 6,
      },
    });

    const catFullStack = await prisma.projectCategory.create({
      data: {
        slug: 'full-stack-development',
        name: 'Full Stack Development',
        description: 'End-to-end mission-critical software systems and digital platforms.',
        icon: 'Layers',
        orderIndex: 7,
      },
    });

    const catCloud = await prisma.projectCategory.create({
      data: {
        slug: 'cloud-and-devops',
        name: 'Cloud and DevOps',
        description: 'Container orchestration, CI/CD automation pipelines, and infrastructure as code.',
        icon: 'Cloud',
        orderIndex: 8,
      },
    });

    const catAutomation = await prisma.projectCategory.create({
      data: {
        slug: 'automation',
        name: 'Automation',
        description: 'Intelligent process orchestration, headless scrapers, and task engines.',
        icon: 'Zap',
        orderIndex: 9,
      },
    });

    const catResearch = await prisma.projectCategory.create({
      data: {
        slug: 'research-and-experiments',
        name: 'Research and Experiments',
        description: 'Exploratory prototypes, theoretical proofs of concept, and architectural lab studies.',
        icon: 'FlaskConical',
        orderIndex: 10,
      },
    });

    // Seed Subcategories (Nested)
    await prisma.projectCategory.createMany({
      data: [
        { slug: 'robotics-ros2', name: 'ROS 2 Systems', parentId: catRobotics.id, orderIndex: 1 },
        { slug: 'robotics-slam', name: 'SLAM & Navigation', parentId: catRobotics.id, orderIndex: 2 },
        { slug: 'robotics-vision', name: 'Autonomous Vision', parentId: catRobotics.id, orderIndex: 3 },
        { slug: 'frontend-threejs', name: 'Interactive 3D / Three.js', parentId: catFrontend.id, orderIndex: 1 },
        { slug: 'backend-distributed', name: 'Distributed APIs & DBs', parentId: catBackend.id, orderIndex: 1 },
      ],
    });
    console.log('✅ Hierarchical Project Categories created.');
  }

  // Skills: the owner-supplied initial inventory. No proficiency scores are invented.
  // OWNER_VERIFIED = the owner states they use it; LEARNING = in progress.
  // Repository/project evidence is attached later by GitHub sync and the admin.
  const owner = (slug: string, name: string, domain: string, category: string) => ({
    slug, name, domain, category,
    proficiencyLevel: 'UNSPECIFIED', level: 'OWNER_VERIFIED', verified: false, detectedOnly: false,
    confidenceScore: 0.5, evidenceNotes: 'Listed by the owner. Awaiting project evidence.',
  });
  const learning = (slug: string, name: string, domain: string, category: string) => ({
    slug, name, domain, category,
    proficiencyLevel: 'FOUNDATIONAL', level: 'LEARNING', verified: false, detectedOnly: false,
    confidenceScore: 0.3, evidenceNotes: 'Currently learning.',
  });
  const skills = [
    owner('c', 'C', 'Languages', 'Programming'),
    owner('cpp', 'C++', 'Languages', 'Programming'),
    owner('python', 'Python', 'Languages', 'Programming'),
    owner('java', 'Java', 'Languages', 'Programming'),
    owner('javascript', 'JavaScript', 'Languages', 'Programming'),
    owner('html', 'HTML', 'Languages', 'Web'),
    owner('css', 'CSS', 'Languages', 'Web'),
    learning('ros2', 'ROS / ROS 2', 'Robotics', 'Robotics'),
    learning('slam', 'SLAM', 'Robotics', 'Robotics'),
    learning('control-systems', 'Control Systems', 'Robotics', 'Robotics'),
    learning('machine-learning', 'Machine Learning', 'Artificial Intelligence', 'AI/ML'),
    learning('computer-vision', 'Computer Vision', 'Artificial Intelligence', 'AI/ML'),
    learning('cybersecurity', 'Cybersecurity', 'Cybersecurity', 'Security'),
    learning('dsa', 'Data Structures & Algorithms', 'Computer Science', 'Algorithms'),
  ];
  for (const sk of skills) {
    await prisma.skill.upsert({ where: { slug: sk.slug }, update: {}, create: sk });
  }

  // Social links: only real, configured ones.
  if ((await prisma.socialLink.count()) === 0) {
    const links = [{ platform: 'GITHUB', label: 'GitHub', url: 'https://github.com/helloAi0', icon: 'Github', orderIndex: 1 }];
    if (process.env.LINKEDIN_PROFILE_URL) {
      links.push({ platform: 'LINKEDIN', label: 'LinkedIn', url: process.env.LINKEDIN_PROFILE_URL, icon: 'Linkedin', orderIndex: 2 });
    }
    await prisma.socialLink.createMany({ data: links });
  }

  // Integrations start as NOT_CONFIGURED/PENDING; syncs update them with real results.
  for (const [platform, identifier] of [
    ['GITHUB', process.env.GITHUB_USERNAME || 'helloAi0'],
    ['LEETCODE', process.env.LEETCODE_USERNAME || ''],
    ['GEEKSFORGEEKS', process.env.GFG_USERNAME || ''],
    ['LINKEDIN', ''],
  ]) {
    await prisma.integration.upsert({
      where: { platform },
      update: {},
      create: { platform, identifier, status: 'PENDING' },
    });
  }

  console.log('Seed complete. No projects, coding stats, certificates, posts or experience were invented.');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
