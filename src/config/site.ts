import { PROFILE } from './profile';

export const siteConfig = {
  name: 'PROJECT LAMO',
  tagline: 'Engineering portfolio of an aspiring AI/ML and robotics engineer',
  description:
    `Portfolio of ${PROFILE.displayName}: B.Tech student in Computer Science and Engineering (AI & ML) with a minor in Cybersecurity and a growing focus on robotics. Inspired by Alexander the Great, Bucephalus, and Macedonian monumental design.`,
  author: {
    name: PROFILE.displayName,
    email: PROFILE.contactEmail,
    github: PROFILE.github.url,
    linkedin: PROFILE.linkedinUrl,
    institution: PROFILE.education.institution,
    degree: 'B.Tech in Computer Science and Engineering (AI & ML)',
    minor: PROFILE.education.minor,
    technicalInterest: 'Robotics',
  },
  links: {
    github: PROFILE.github.url,
    repository: 'https://github.com/helloAi0/Portfolio',
    deployTarget: 'Render',
  },
  theme: {
    imperialGold: '#d4af37',
    bronze: '#8c6834',
    charcoal: '#0c0e12',
    marbleAccent: '#161a22',
  },
};
