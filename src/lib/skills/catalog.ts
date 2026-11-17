/**
 * Canonical skill catalog.
 *
 * Maps technologies found in repositories (topics, dependencies, README) to portfolio
 * skills. Detection is evidence that a technology is USED. It is never proof of
 * proficiency: detected skills are stored as REPOSITORY_DETECTED until the owner confirms.
 *
 * Slugs for the owner-supplied initial inventory (c, cpp, python, java, javascript, html,
 * css, ros2, slam, control-systems, machine-learning, computer-vision, cybersecurity, dsa)
 * match prisma/seed.ts so detection attaches evidence to those records instead of
 * creating duplicates.
 */

export interface CatalogSkill {
  slug: string;
  name: string;
  domain: string;
  category: string;
  /** Whole-word terms trusted everywhere: topics, dependency manifests, names, descriptions and README prose. */
  terms: string[];
  /**
   * Ambiguous everyday words ("next", "three", "navigation", "security"). Counted ONLY from
   * structured sources (GitHub topics, dependency manifests, repo name), never from prose.
   */
  structured?: string[];
}

export const SKILL_CATALOG: CatalogSkill[] = [
  // Programming languages (also detected from GitHub language bytes)
  { slug: 'c', name: 'C', domain: 'Languages', category: 'Programming', terms: [] },
  { slug: 'cpp', name: 'C++', domain: 'Languages', category: 'Programming', terms: ['c++', 'cpp', 'cmake'] },
  { slug: 'python', name: 'Python', domain: 'Languages', category: 'Programming', terms: ['python', 'pip', 'pytest'] },
  { slug: 'java', name: 'Java', domain: 'Languages', category: 'Programming', terms: ['java', 'maven', 'gradle'] },
  { slug: 'javascript', name: 'JavaScript', domain: 'Languages', category: 'Programming', terms: ['javascript', 'nodejs'], structured: ['node'] },
  { slug: 'typescript', name: 'TypeScript', domain: 'Languages', category: 'Programming', terms: ['typescript', 'tsconfig'] },
  { slug: 'html', name: 'HTML', domain: 'Languages', category: 'Web', terms: [] },
  { slug: 'css', name: 'CSS', domain: 'Languages', category: 'Web', terms: ['css'] },

  // Frontend
  { slug: 'react', name: 'React', domain: 'Frontend', category: 'Frameworks', terms: ['reactjs', 'react js', 'react dom'], structured: ['react'] },
  { slug: 'nextjs', name: 'Next.js', domain: 'Frontend', category: 'Frameworks', terms: ['nextjs', 'next js'], structured: ['next'] },
  { slug: 'tailwindcss', name: 'Tailwind CSS', domain: 'Frontend', category: 'Frameworks', terms: ['tailwind', 'tailwindcss'] },
  { slug: 'threejs', name: 'Three.js / WebGL', domain: 'Frontend', category: 'Creative Frontend', terms: ['threejs', 'three js', 'webgl', 'react three fiber'], structured: ['three', 'r3f'] },

  // Backend
  { slug: 'nodejs', name: 'Node.js', domain: 'Backend', category: 'Runtime', terms: ['nestjs', 'node js'], structured: ['express', 'fastify'] },
  { slug: 'api-development', name: 'API Development', domain: 'Backend', category: 'APIs', terms: ['restful', 'graphql', 'openapi', 'fastapi', 'flask', 'django'], structured: ['rest', 'api'] },
  { slug: 'authentication', name: 'Authentication', domain: 'Backend', category: 'Security', terms: ['jwt', 'oauth', 'authentication', 'bcrypt', 'next auth'], structured: ['auth'] },

  // Databases
  { slug: 'postgresql', name: 'PostgreSQL', domain: 'Databases', category: 'Relational', terms: ['postgresql', 'postgres', 'psycopg2'] },
  { slug: 'sql', name: 'SQL', domain: 'Databases', category: 'Relational', terms: ['sql', 'sqlite', 'mysql'] },
  { slug: 'prisma', name: 'Prisma ORM', domain: 'Databases', category: 'ORM', terms: ['prisma'] },
  { slug: 'mongodb', name: 'MongoDB', domain: 'Databases', category: 'NoSQL', terms: ['mongodb', 'mongoose'] },

  // AI / ML
  { slug: 'machine-learning', name: 'Machine Learning', domain: 'Artificial Intelligence', category: 'AI/ML', terms: ['machine learning', 'scikit learn', 'sklearn', 'xgboost'], structured: ['ml', 'classification', 'regression'] },
  { slug: 'deep-learning', name: 'Deep Learning', domain: 'Artificial Intelligence', category: 'AI/ML', terms: ['deep learning', 'neural network', 'neural networks', 'cnn', 'lstm', 'pytorch', 'tensorflow', 'keras'] },
  { slug: 'computer-vision', name: 'Computer Vision', domain: 'Artificial Intelligence', category: 'AI/ML', terms: ['computer vision', 'opencv', 'cv2', 'object detection', 'yolo', 'image segmentation'] },
  { slug: 'nlp', name: 'Natural Language Processing', domain: 'Artificial Intelligence', category: 'AI/ML', terms: ['nlp', 'natural language processing', 'spacy', 'nltk', 'bert'], structured: ['transformers'] },
  { slug: 'generative-ai', name: 'Generative AI / LLMs', domain: 'Artificial Intelligence', category: 'AI/ML', terms: ['llm', 'llms', 'generative ai', 'gpt', 'langchain', 'rag', 'gemini'] },
  { slug: 'data-science', name: 'Data Analysis', domain: 'Artificial Intelligence', category: 'Data', terms: ['pandas', 'numpy', 'matplotlib', 'jupyter', 'data analysis'] },

  // Robotics
  { slug: 'ros2', name: 'ROS / ROS 2', domain: 'Robotics', category: 'Robotics', terms: ['ros', 'ros2', 'ros 2', 'rclpy', 'rclcpp', 'ament', 'colcon', 'catkin'] },
  { slug: 'slam', name: 'SLAM', domain: 'Robotics', category: 'Robotics', terms: ['slam', 'gmapping', 'cartographer', 'orb slam'] },
  { slug: 'robot-navigation', name: 'Robot Navigation', domain: 'Robotics', category: 'Robotics', terms: ['nav2', 'path planning', 'motion planning', 'obstacle avoidance'], structured: ['navigation'] },
  { slug: 'control-systems', name: 'Control Systems', domain: 'Robotics', category: 'Robotics', terms: ['control system', 'control systems', 'kalman', 'kalman filter'], structured: ['pid', 'mpc'] },
  { slug: 'robot-simulation', name: 'Robot Simulation', domain: 'Robotics', category: 'Robotics', terms: ['gazebo', 'webots', 'pybullet', 'mujoco', 'rviz', 'isaac sim'] },
  { slug: 'sensor-fusion', name: 'Sensor Fusion', domain: 'Robotics', category: 'Robotics', terms: ['lidar', 'imu', 'sensor fusion', 'odometry'] },

  // Embedded
  { slug: 'embedded-systems', name: 'Embedded Systems', domain: 'Electronics and Embedded', category: 'Embedded', terms: ['arduino', 'esp32', 'stm32', 'raspberry pi', 'microcontroller', 'embedded', 'firmware', 'platformio'] },
  { slug: 'iot', name: 'IoT', domain: 'Electronics and Embedded', category: 'Embedded', terms: ['iot', 'mqtt', 'internet of things'] },

  // Cybersecurity
  { slug: 'cybersecurity', name: 'Cybersecurity', domain: 'Cybersecurity', category: 'Security', terms: ['cybersecurity', 'infosec', 'ctf', 'pentest', 'penetration testing', 'exploit', 'owasp'], structured: ['security', 'vulnerability'] },
  { slug: 'cryptography', name: 'Cryptography', domain: 'Cybersecurity', category: 'Security', terms: ['cryptography', 'encryption', 'aes', 'rsa', 'cipher'] },
  { slug: 'network-security', name: 'Network Security', domain: 'Cybersecurity', category: 'Security', terms: ['nmap', 'wireshark', 'firewall', 'packet', 'scapy'] },

  // Cloud & DevOps
  { slug: 'docker', name: 'Docker', domain: 'Cloud and DevOps', category: 'Containers', terms: ['docker', 'dockerfile', 'docker compose'], structured: ['container'] },
  { slug: 'ci-cd', name: 'CI/CD', domain: 'Cloud and DevOps', category: 'DevOps', terms: ['github actions', 'ci cd', 'ci/cd', 'jenkins', 'gitlab ci'] },
  { slug: 'cloud-computing', name: 'Cloud Computing', domain: 'Cloud and DevOps', category: 'Cloud', terms: ['aws', 'gcp', 'azure', 'kubernetes', 'terraform', 'vercel'], structured: ['render'] },
  { slug: 'linux', name: 'Linux', domain: 'Engineering Tools', category: 'Tools', terms: ['linux', 'ubuntu', 'bash'], structured: ['shell'] },

  // Algorithms
  { slug: 'dsa', name: 'Data Structures & Algorithms', domain: 'Computer Science', category: 'Algorithms', terms: ['data structures', 'algorithms', 'dsa', 'leetcode', 'competitive programming'] },
];

export const SKILL_BY_SLUG = new Map(SKILL_CATALOG.map((s) => [s.slug, s]));

/** GitHub language name -> skill slug. */
export const LANGUAGE_SKILLS: Record<string, string> = {
  C: 'c',
  'C++': 'cpp',
  Python: 'python',
  Java: 'java',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  HTML: 'html',
  CSS: 'css',
};
