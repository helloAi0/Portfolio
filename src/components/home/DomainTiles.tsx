import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { TiltCard, ScrollDepth } from '@/components/motion/Depth';

interface Cat { slug: string; name: string; description?: string | null; count: number }

/** Dribbble-style oversized tiles, one per engineering domain, linked to the filtered project list. */
export function DomainTiles({ cats }: { cats: Cat[] }) {
  if (cats.length === 0) return null;
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" aria-labelledby="domains-h">
      <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mb-4">Domains</p>
      <h2 id="domains-h" className="font-serif font-black text-white text-4xl sm:text-6xl leading-[0.95] max-w-3xl">Pick a field.<br /><span className="text-gold-300">See what I built in it.</span></h2>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[220px] gap-4">
        {cats.map((c, i) => (
          <ScrollDepth key={c.slug} className={i % 5 === 0 ? 'lg:col-span-2' : ''} strength={0.5}>
            <TiltCard className="h-full">
              <Link href={`/projects?category=${c.slug}`} className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-gold-500/15 bg-gradient-to-br from-imperial-800/80 to-imperial-950 p-6 hover:border-gold-500/60 transition-colors">
                <span aria-hidden className="absolute -right-3 -bottom-8 font-serif font-black text-[9rem] leading-none text-gold-500/[0.07] group-hover:text-gold-500/15 transition-colors">{c.name.charAt(0)}</span>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-gold-400">{String(i + 1).padStart(2, '0')}</span>
                  <ArrowUpRight className="w-5 h-5 text-neutral-500 group-hover:text-gold-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" aria-hidden />
                </div>
                <div className="relative">
                  <h3 className="font-serif font-black text-white text-2xl leading-tight">{c.name}</h3>
                  <p className="mt-1 text-xs font-mono text-neutral-400">{c.count} project{c.count === 1 ? '' : 's'}</p>
                </div>
              </Link>
            </TiltCard>
          </ScrollDepth>
        ))}
      </div>
    </section>
  );
}
