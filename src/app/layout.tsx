import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { IdentityVerificationBanner } from '@/components/home/IdentityVerificationBanner';
import LamoChatWidget from '@/components/lamo/LamoChatWidget';
import { siteConfig } from '@/config/site';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://projectlamo.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteConfig.name} | ${siteConfig.author.name} — AI & Autonomous Robotics`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'Sahil Depurwala',
    'Project LAMO',
    'Artificial Intelligence',
    'Autonomous Robotics',
    'ROS 2 Humble',
    'SLAM',
    'Cybersecurity',
    'Three.js WebGL',
    'UEM IEM Kolkata',
    'Imperial Engineering',
    'Bucephalus',
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
    creator: '@helloAi0',
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
    alumnusOf: {
      '@type': 'EducationalOrganization',
      name: siteConfig.author.institution,
    },
    jobTitle: 'Artificial Intelligence and Autonomous Robotics Engineer',
    knowsAbout: [
      'Artificial Intelligence',
      'Machine Learning',
      'Autonomous Robotics',
      'ROS 2',
      'SLAM',
      'Cybersecurity',
      'Three.js WebGL',
    ],
    sameAs: [
      siteConfig.author.github,
      siteConfig.author.linkedin,
    ],
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
        <IdentityVerificationBanner />
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
