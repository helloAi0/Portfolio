import { LamoMark } from '@/components/brand/LamoMark';
import React from 'react';
import Link from 'next/link';
import { resolveIdentitySafety } from '@/lib/identity';
import { Github, ArrowUpRight, Cpu } from 'lucide-react';
import { getPublicProfile } from '@/lib/services/publicProfile';

export async function Footer() {
  const identity = resolveIdentitySafety();
  const profile = await getPublicProfile();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-imperial-950 border-t border-gold-500/20 text-neutral-400 relative overflow-hidden">
      {/* Subtle marble accent pattern overlay */}
      <div className="absolute inset-0 bg-imperial-radial opacity-50 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Imperial Brand Column */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-gold-500/20 border border-gold-500/50 flex items-center justify-center">
                <LamoMark size={20} />
              </div>
              <span className="font-serif font-bold text-white tracking-widest text-base">
                PROJECT LAMO
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              The engineering portfolio of {identity.displayName}, inspired by Macedonian monumentality.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-imperial-900 border border-gold-500/20 text-[10px] font-mono text-gold-400">
                <Cpu className="w-3 h-3 text-gold-400" />
                <span>Next.js 14 • Prisma • WebGL Three.js</span>
              </span>
            </div>
          </div>

          {/* Core Citadel Portals */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-gold-400 mb-4">
              Citadel Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-gold-300 transition-colors">
                  Imperial Citadel (Home)
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-gold-300 transition-colors">
                  About & Identity
                </Link>
              </li>
              <li>
                <Link href="/education" className="hover:text-gold-300 transition-colors">
                  Academic Foundation
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-gold-300 transition-colors">
                  Flagship Project Explorer
                </Link>
              </li>
              <li>
                <Link href="/skills" className="hover:text-gold-300 transition-colors">
                  Skill Taxonomy
                </Link>
              </li>
            </ul>
          </div>

          {/* Engineering Domains */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-gold-400 mb-4">
              Engineering Disciplines
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/domains#robotics" className="hover:text-gold-300 transition-colors">
                  Robotics
                </Link>
              </li>
              <li>
                <Link href="/domains#ai" className="hover:text-gold-300 transition-colors">
                  Artificial Intelligence
                </Link>
              </li>
              <li>
                <Link href="/domains#cybersecurity" className="hover:text-gold-300 transition-colors">
                  Cybersecurity & Zero-Trust
                </Link>
              </li>
              <li>
                <Link href="/coding-arena" className="hover:text-gold-300 transition-colors">
                  Competitive Coding Arena
                </Link>
              </li>
              <li>
                <Link href="/journey" className="hover:text-gold-300 transition-colors">
                  Professional Journey (2024–2028)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-gold-400">
              Get in touch
            </h4>
            <p className="text-xs leading-relaxed">
              <a href={`mailto:${profile.contactEmail}`} className="text-gold-300 hover:underline break-all">
                {profile.contactEmail}
              </a>
              <br />
              <Link href="/contact" className="hover:text-gold-300">Send an enquiry &rarr;</Link>
            </p>

            <div className="flex items-center space-x-3 pt-1">
              <Link
                href={profile.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-xs text-neutral-400 hover:text-gold-300"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
              {profile.linkedinUrl && (
                <Link
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-xs text-neutral-400 hover:text-gold-300"
                >
                  <span>LinkedIn</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 space-y-4 sm:space-y-0">
          <p>© {currentYear} Project LAMO. Portfolio of {identity.displayName}.</p>
          <div className="flex items-center space-x-6 text-[11px] font-mono">
            <Link href="/resume" className="hover:text-gold-400 transition-colors">
              Curriculum Vitae
            </Link>
            <Link href="/contact" className="hover:text-gold-400 transition-colors">
              Dispatch Transmission
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

