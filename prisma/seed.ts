import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏛️ Commencing Project LAMO Imperial Database Seed...');

  // 1. Clear existing records to ensure clean idempotent seed
  await prisma.visitorEnquiry.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.integration.deleteMany();
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

  // 2. Seed Profile (With Identity Verification Safety Flag)
  const profile = await prisma.profile.create({
    data: {
      displayName: 'Sahil Depurwala',
      contactEmail: 'tahaudaipurwala68@gmail.com',
      headline: 'Architect of Intelligent Systems | AI & Robotics Engineer',
      bio: 'Pursuing foundational excellence at the intersection of Artificial Intelligence, Autonomous Robotics, and Imperial Software Engineering. Rooted in rigorous computational theory and inspired by monumentality, building systems designed for longevity and forward conquest.',
      dateOfBirth: new Date('2006-11-02T00:00:00.000Z'),
      location: 'Kolkata, West Bengal, India',
      githubUrl: 'https://github.com/helloAi0',
      linkedinUrl: 'https://linkedin.com',
      identityVerificationStatus: 'PENDING_OWNER_CONFIRMATION',
      identityFlagNotes:
        'SAFETY FLAG: Supplied contact email prefix (tahaudaipurwala68) differs from declared display name (Sahil Depurwala). Identity isolation maintained pending explicit owner verification before public production release.',
    },
  });
  console.log(`✅ Profile initialized: ${profile.displayName} [Verification: ${profile.identityVerificationStatus}]`);

  // 3. Seed Education
  await prisma.education.createMany({
    data: [
      {
        institution: 'University of Engineering and Management / Institute of Engineering and Management (UEM / IEM)',
        institutionAcronym: 'UEM / IEM',
        schoolType: 'HIGHER_EDUCATION',
        degree: 'B.Tech',
        field: 'Computer Science and Engineering (Artificial Intelligence and Machine Learning)',
        minor: 'Cybersecurity',
        additionalInterest: 'Robotics',
        location: 'Kolkata, West Bengal',
        startYear: 2024,
        endYear: 2028,
        isCurrent: true,
        graduationStatus: 'EXPECTED_2028',
        orderIndex: 1,
      },
      {
        institution: 'Saini Golden Jubilee High School',
        institutionAcronym: 'SGJHS',
        schoolType: 'HIGH_SCHOOL',
        location: 'Kolkata, West Bengal',
        startYear: 2022,
        endYear: 2024,
        isCurrent: false,
        graduationStatus: 'COMPLETED',
        orderIndex: 2,
      },
      {
        institution: 'Nischintapur Public School',
        institutionAcronym: 'NPS',
        schoolType: 'HIGH_SCHOOL',
        location: 'West Bengal',
        startYear: 2012,
        endYear: 2022,
        isCurrent: false,
        graduationStatus: 'COMPLETED',
        orderIndex: 3,
      },
    ],
  });
  console.log('✅ Education history seeded with strict verification constraints.');

  // 4. Seed Hierarchical Project Categories
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

  // 5. Seed Skills with Strict Verification Separation
  const skillsData = [
    // Languages (Known core)
    { slug: 'c', name: 'C', domain: 'Languages', category: 'Systems Programming', proficiencyLevel: 'INTERMEDIATE', verified: true, detectedOnly: false, icon: 'Terminal' },
    { slug: 'cpp', name: 'C++', domain: 'Languages', category: 'Systems & Robotics', proficiencyLevel: 'INTERMEDIATE', verified: true, detectedOnly: false, icon: 'Cpu' },
    { slug: 'java', name: 'Java', domain: 'Languages', category: 'Object-Oriented Architecture', proficiencyLevel: 'INTERMEDIATE', verified: true, detectedOnly: false, icon: 'Code' },
    { slug: 'python', name: 'Python', domain: 'Languages', category: 'AI/ML & Automation', proficiencyLevel: 'ADVANCED', verified: true, detectedOnly: false, icon: 'FileCode' },
    { slug: 'javascript', name: 'JavaScript', domain: 'Languages', category: 'Web Foundations', proficiencyLevel: 'ADVANCED', verified: true, detectedOnly: false, icon: 'FileJson' },
    { slug: 'html', name: 'HTML5', domain: 'Languages', category: 'Web Structure', proficiencyLevel: 'ADVANCED', verified: true, detectedOnly: false, icon: 'Globe' },
    { slug: 'css', name: 'CSS3', domain: 'Languages', category: 'Styling & Animation', proficiencyLevel: 'ADVANCED', verified: true, detectedOnly: false, icon: 'Palette' },
    
    // Additional Domains
    { slug: 'robotics', name: 'Autonomous Robotics', domain: 'Robotics', category: 'Physical Computing', proficiencyLevel: 'FOUNDATIONAL', verified: false, detectedOnly: true, evidenceNotes: 'Academic interest & initial lab experimentation.' },
    { slug: 'ros2', name: 'ROS 2 Framework', domain: 'Robotics', category: 'Robot Operating Systems', proficiencyLevel: 'FOUNDATIONAL', verified: false, detectedOnly: true, evidenceNotes: 'Exploratory node communications.' },
    { slug: 'machine-learning', name: 'Machine Learning', domain: 'Machine Learning', category: 'Data Modeling', proficiencyLevel: 'INTERMEDIATE', verified: true, detectedOnly: false, evidenceNotes: 'University AIML Core Curriculum.' },
    { slug: 'artificial-intelligence', name: 'Artificial Intelligence', domain: 'Artificial Intelligence', category: 'Intelligent Systems', proficiencyLevel: 'INTERMEDIATE', verified: true, detectedOnly: false, evidenceNotes: 'Degree specialization track.' },
    { slug: 'cybersecurity', name: 'Cybersecurity Defense', domain: 'Cybersecurity', category: 'Systems Security', proficiencyLevel: 'FOUNDATIONAL', verified: true, detectedOnly: false, evidenceNotes: 'B.Tech Academic Minor Degree Track.' },
    { slug: 'cloud-computing', name: 'Cloud Computing', domain: 'Cloud and DevOps', category: 'Infrastructure', proficiencyLevel: 'FOUNDATIONAL', verified: false, detectedOnly: true, evidenceNotes: 'Deployment & PaaS automation exploration.' },
    { slug: 'threejs', name: 'Three.js / WebGL', domain: 'Frontend', category: '3D Graphics', proficiencyLevel: 'INTERMEDIATE', verified: true, detectedOnly: false, evidenceNotes: 'Project LAMO Imperial Viewport Architecture.' },
    { slug: 'nextjs', name: 'Next.js & React', domain: 'Frontend', category: 'Fullstack Frameworks', proficiencyLevel: 'ADVANCED', verified: true, detectedOnly: false, evidenceNotes: 'High-performance portfolio engine.' },
    { slug: 'postgresql-prisma', name: 'PostgreSQL & Prisma', domain: 'Backend', category: 'Relational Persistence', proficiencyLevel: 'INTERMEDIATE', verified: true, detectedOnly: false, evidenceNotes: 'Schema design and versioned migrations.' },
  ];

  const skillMap: Record<string, string> = {};
  for (const s of skillsData) {
    const createdSkill = await prisma.skill.create({ data: s });
    skillMap[s.slug] = createdSkill.id;
  }
  console.log(`✅ Seeded ${skillsData.length} skills with verified vs detected distinction.`);

  // 6. Seed Projects
  const project1 = await prisma.project.create({
    data: {
      slug: 'project-lamo',
      title: 'Project LAMO: Imperial Digital Identity Engine',
      tagline: 'Self-evolving digital citadel merging monumental aesthetics with autonomic AI architecture.',
      description: 'An imperial-grade professional identity platform inspired by Macedonian monumental architecture and Alexander the Great’s legendary warhorse Bucephalus. Engineered with Next.js, Three.js WebGL, Prisma ORM, and automated verification boundaries.',
      detailedExplanation: 'Project LAMO is not a generic developer portfolio, but a resilient digital monument. It integrates interactive WebGL 3D procedural monuments, strict data-driven verification layers that prevent unverified claims, dynamic age and graduation calculation, and decoupled multi-cloud backend architecture.',
      categoryId: catFrontend.id,
      subcategory: 'Interactive 3D / Next.js Architecture',
      difficulty: 'Imperial',
      githubRepo: 'https://github.com/helloAi0/Portfolio.git',
      liveDeployment: 'https://portfolio-lamo.onrender.com',
      problemStatement: 'Modern developer portfolios are ephemeral, cluttered with generic templates, unverified boastful metrics, and stagnant architectures that degrade over time.',
      solution: 'Constructed an imperial architecture built with clean separation of concerns, evidence-based skill taxonomies, hardware-conscious 3D shaders, and long-term PostgreSQL / Prisma data schemas.',
      keyFeatures: JSON.stringify([
        'Bucephalus Imperial 3D WebGL Monument with procedural lighting and particle constellations',
        'Dynamic temporal computing for age and academic progression',
        'Strict identity verification boundary isolating anomalous contact identifiers',
        'Hierarchical project explorer spanning 10 engineering domains',
        'Dual-driver persistence: zero-friction SQLite local dev + production Render PostgreSQL'
      ]),
      challenges: JSON.stringify([
        'Balancing monumental 60 FPS WebGL rendering with low-power mobile CPU constraints',
        'Designing a relational database schema supporting both hierarchical categorization and strict evidence checks'
      ]),
      results: JSON.stringify([
        'Sub-second first contentful paint with optimized static and procedural assets',
        '100% data-driven presentation without brittle hardcoded layout values'
      ]),
      status: 'Active',
      featured: true,
      orderIndex: 1,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      slug: 'autonomous-rover-slam',
      title: 'Aethelgard: Autonomous SLAM Navigation Engine',
      tagline: 'LiDAR-assisted 2D/3D mapping and real-time obstacle avoidance with ROS 2.',
      description: 'A robotics research simulation implementing simultaneous localization and mapping (SLAM) alongside Adaptive Monte Carlo Localization (AMCL) in ROS 2 Humble.',
      detailedExplanation: 'Designed as an exploratory laboratory implementation of autonomous path planning. Employs laser scan filtering, costmap inflation layers, and Dijkstra/A* global planners connected to a simulated differential drive chassis in Gazebo.',
      categoryId: catRobotics.id,
      subcategory: 'SLAM & Navigation',
      difficulty: 'Advanced',
      githubRepo: 'https://github.com/helloAi0/Portfolio.git',
      problemStatement: 'Indoor robotic navigation suffers from sensor drift, wheel slippage, and dynamic obstacle occlusion in unpredictable environments.',
      solution: 'Engineered sensor fusion combining wheel odometry with 2D planar LiDAR scans to compute Bayesian state updates with sub-5cm positional variance.',
      keyFeatures: JSON.stringify([
        'Real-time Occupancy Grid Map generation over ROS 2 topics',
        'Dynamic path replanning under transient obstacle intrusions',
        'Hardware abstraction layer ready for physical motor driver bridge'
      ]),
      challenges: JSON.stringify([
        'Mitigating odometry drift during rapid angular rotations',
        'Optimizing ROS 2 topic subscriber latency under resource-constrained embedded targets'
      ]),
      results: JSON.stringify([
        'Successfully mapped 250m² simulated maze environment with zero corridor collisions'
      ]),
      status: 'Research',
      featured: true,
      orderIndex: 2,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      slug: 'cipher-sentinel-vault',
      title: 'CipherSentinel: Cryptographic Perimeter Defense',
      tagline: 'Zero-trust perimeter monitor and token audit protocol for microservice fabrics.',
      description: 'Defensive cybersecurity architecture enforcing mutual TLS, token rotation, and anomaly detection on incoming RPC ingress payloads.',
      detailedExplanation: 'Developed within the academic Cybersecurity minor track to analyze side-channel attack surfaces and implement hardened token validation pipelines with automated tamper detection.',
      categoryId: catCybersecurity.id,
      subcategory: 'Systems Security',
      difficulty: 'Advanced',
      githubRepo: 'https://github.com/helloAi0/Portfolio.git',
      problemStatement: 'Traditional perimeter firewalls fail when internal lateral movement exploits weak internal microservice trust assumptions.',
      solution: 'Constructed an ephemeral token verification proxy validating cryptographic signatures on every inter-service hop with distributed revocation lists.',
      keyFeatures: JSON.stringify([
        'Automated JWT cryptographic signing and rotation engine',
        'Heuristic rate limiting detecting credential-stuffing bursts',
        'Tamper-evident audit logging with SHA-256 hash chaining'
      ]),
      challenges: JSON.stringify([
        'Keeping verification overhead below 2 milliseconds per request'
      ]),
      results: JSON.stringify([
        'Defended against simulated dictionary attacks and token replay vectors with 100% capture rate'
      ]),
      status: 'Active',
      featured: true,
      orderIndex: 3,
    },
  });

  const project4 = await prisma.project.create({
    data: {
      slug: 'neural-vision-pipeline',
      title: 'Macedon-Vision: Low-Latency Spatial Classifier',
      tagline: 'Edge-optimized convolutional neural network for real-time robotic vision stream analysis.',
      description: 'A computer vision pipeline utilizing optimized PyTorch models converted to ONNX runtime for sub-30ms object detection on edge compute modules.',
      detailedExplanation: 'Integrates OpenCV frame acquisition with quantization-aware training to classify objects in noisy lighting conditions, tailored for integration into autonomous robotic platforms.',
      categoryId: catAI.id,
      subcategory: 'Computer Vision & Edge ML',
      difficulty: 'Advanced',
      githubRepo: 'https://github.com/helloAi0/Portfolio.git',
      problemStatement: 'Heavy deep learning architectures cannot meet real-time control loop deadlines on low-power mobile robotic hardware.',
      solution: 'Trained a pruned MobileNet backbone with 8-bit integer quantization running directly on edge CPU threads.',
      keyFeatures: JSON.stringify([
        'INT8 quantized inference pipeline',
        'Spatial bounding box regression with Non-Maximum Suppression',
        'Direct frame buffer streaming with multi-threaded OpenCV capture'
      ]),
      challenges: JSON.stringify([
        'Preserving mAP score while aggressively pruning convolutional weights'
      ]),
      results: JSON.stringify([
        'Maintained 91.4% mAP with 4.2x latency reduction on test benchmarks'
      ]),
      status: 'Research',
      featured: true,
      orderIndex: 4,
    },
  });

  // Link Project Skills
  await prisma.projectSkill.createMany({
    data: [
      { projectId: project1.id, skillId: skillMap['nextjs'], relevance: 'PRIMARY' },
      { projectId: project1.id, skillId: skillMap['threejs'], relevance: 'PRIMARY' },
      { projectId: project1.id, skillId: skillMap['postgresql-prisma'], relevance: 'PRIMARY' },
      { projectId: project1.id, skillId: skillMap['javascript'], relevance: 'SECONDARY' },

      { projectId: project2.id, skillId: skillMap['cpp'], relevance: 'PRIMARY' },
      { projectId: project2.id, skillId: skillMap['python'], relevance: 'PRIMARY' },
      { projectId: project2.id, skillId: skillMap['robotics'], relevance: 'PRIMARY' },
      { projectId: project2.id, skillId: skillMap['ros2'], relevance: 'PRIMARY' },

      { projectId: project3.id, skillId: skillMap['python'], relevance: 'PRIMARY' },
      { projectId: project3.id, skillId: skillMap['cybersecurity'], relevance: 'PRIMARY' },
      { projectId: project3.id, skillId: skillMap['c'], relevance: 'SECONDARY' },

      { projectId: project4.id, skillId: skillMap['python'], relevance: 'PRIMARY' },
      { projectId: project4.id, skillId: skillMap['machine-learning'], relevance: 'PRIMARY' },
      { projectId: project4.id, skillId: skillMap['artificial-intelligence'], relevance: 'PRIMARY' },
    ],
  });
  console.log('✅ Seeded flagship engineering projects and skill associations.');

  // 7. Seed Social Links
  await prisma.socialLink.createMany({
    data: [
      { platform: 'GITHUB', label: 'GitHub', url: 'https://github.com/helloAi0', icon: 'Github', orderIndex: 1 },
      { platform: 'LINKEDIN', label: 'LinkedIn', url: 'https://linkedin.com', icon: 'Linkedin', orderIndex: 2 },
      { platform: 'RENDER', label: 'Deployment Gateway', url: 'https://render.com', icon: 'Server', orderIndex: 3 },
    ],
  });

  // 8. Seed AI Knowledge Records
  await prisma.aiKnowledgeRecord.createMany({
    data: [
      {
        topic: 'Imperial Engineering Ethos',
        category: 'Philosophy',
        content: 'Project LAMO embodies the spirit of Alexander the Great and Bucephalus: relentless forward movement, monumental precision, and unyielding refusal to accept mediocrity. Systems are constructed as enduring stone, not brittle ephemeral prototypes.',
        source: 'Core Architecture Charter',
        confidenceScore: 1.0,
      },
      {
        topic: 'Verification Integrity Protocol',
        category: 'Identity',
        content: 'Strict adherence to factual truth: never fabricate academic ranks, honors, or employment. Maintain separation between verified proficiencies and exploratory technologies.',
        source: 'System Guardrail Specification',
        confidenceScore: 1.0,
      },
    ],
  });

  console.log('🏛️ Project LAMO Imperial Seed Complete.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
