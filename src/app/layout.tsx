import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RevealObserver } from '@/components/motion/RevealObserver';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import LamoChatWidget from '@/components/lamo/LamoChatWidget';
import { siteConfig } from '@/config/site';

import { SITE_URL as siteUrl } from '@/config/profile';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteConfig.name} | ${siteConfig.author.name} — AI/ML & Robotics`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'Taha Udaipurwala',
    'Project LAMO',
    'Artificial Intelligence',
    'Machine Learning',
    'Robotics',
    'Cybersecurity',
    'B.Tech Computer Science',
    'Portfolio',
  ],
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.github }],
  creator: siteConfig.author.name,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${siteConfig.name} | ${siteConfig.author.name}`,
    description: siteConfig.description,
    url: siteUrl,
    siteName: siteConfig.name,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} | ${siteConfig.author.name}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLdPerson = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteConfig.author.name,
    url: siteUrl,
    ...(siteConfig.author.institution
      ? { alumnusOf: { '@type': 'EducationalOrganization', name: siteConfig.author.institution } }
      : {}),
    knowsAbout: ['Artificial Intelligence', 'Machine Learning', 'Robotics', 'Cybersecurity'],
    sameAs: [siteConfig.author.github, siteConfig.author.linkedin].filter(Boolean),
  };

  const jsonLdWebSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteUrl,
    description: siteConfig.description,
    author: {
      '@type': 'Person',
      name: siteConfig.author.name,
    },
  };

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPerson) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
      </head>
      <body className="bg-[#08090c] text-neutral-200 antialiased min-h-screen flex flex-col justify-between selection:bg-gold-500/30 selection:text-gold-200">
        
        <ScrollProgress />
        <RevealObserver />
        <Header />
        <main id="main-content" className="flex-1 w-full pt-16" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <LamoChatWidget />
      </body>
    </html>
  );
}
