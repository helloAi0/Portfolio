import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { IdentityVerificationBanner } from '@/components/home/IdentityVerificationBanner';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | ${siteConfig.author.name}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'Sahil Depurwala',
    'Project LAMO',
    'Artificial Intelligence',
    'Autonomous Robotics',
    'Cybersecurity',
    'Three.js WebGL',
    'UEM IEM Kolkata',
    'Imperial Engineering',
  ],
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.github }],
  creator: siteConfig.author.name,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#08090c] text-neutral-200 antialiased min-h-screen flex flex-col justify-between selection:bg-gold-500/30 selection:text-gold-200">
        <IdentityVerificationBanner />
        <Header />
        <main className="flex-1 w-full pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

