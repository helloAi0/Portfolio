export interface NavItem {
  title: string;
  href: string;
  description?: string;
  badge?: string;
  isExternal?: boolean;
}

export const mainNavItems: NavItem[] = [
  { title: 'Citadel', href: '/' },
  { title: 'About', href: '/about' },
  { title: 'Education', href: '/education' },
  { title: 'Projects', href: '/projects', badge: 'Flagship' },
  { title: 'Domains', href: '/domains' },
  { title: 'Skills', href: '/skills' },
  { title: 'Journey', href: '/journey' },
  { title: 'Resume', href: '/resume' },
  { title: 'Contact', href: '/contact' },
];

export const secondaryNavItems: NavItem[] = [
  { title: 'Ambitions & Goals', href: '/ambitions' },
  { title: 'Coding Arena', href: '/coding-arena' },
  { title: 'Achievements', href: '/achievements' },
  { title: 'Certificates', href: '/certificates' },
  { title: 'Scholarships', href: '/scholarships' },
  { title: 'Experience', href: '/experience' },
];
