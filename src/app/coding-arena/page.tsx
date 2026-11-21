import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ScrollDepth } from '@/components/motion/Depth';
import { ProfilePortal } from '@/components/coding/ProfilePortal';

export const metadata = {
  title: 'Coding Arena',
  description: "Taha Udaipurwala's LeetCode and GeeksforGeeks profiles.",
};

// Public profile handles (not secrets). Override with LEETCODE_USERNAME / GFG_USERNAME if they change.
const LEETCODE = process.env.LEETCODE_USERNAME || 'WLq0hyCLJz';
const GFG = process.env.GFG_USERNAME || 'tahaudaip7eby';

export default function CodingArenaPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-28">
      <Breadcrumbs items={[{ label: 'Coding Arena' }]} />
      <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-gold-400 mt-10 mb-4">Coding Arena</p>
      <h1 className="font-serif font-black text-white leading-[0.95] text-[clamp(2.4rem,7vw,5.5rem)]">Where I practise.</h1>
      <p className="mt-5 text-neutral-300 max-w-xl">Two doors. Each one opens my real public profile, where my solved problems and history live. Nothing here is copied or estimated.</p>

      <div className="mt-16 grid md:grid-cols-2 gap-10">
        <ScrollDepth strength={0.7}>
          <ProfilePortal name="LeetCode" handle={LEETCODE} href={`https://leetcode.com/u/${LEETCODE}/`} glyph="{ }" blurb="Algorithms and data-structure practice." />
        </ScrollDepth>
        <ScrollDepth strength={0.7}>
          <ProfilePortal name="GeeksforGeeks" handle={GFG} href={`https://www.geeksforgeeks.org/profile/${GFG}`} glyph="GfG" blurb="Problem solving, practice and learning streaks." />
        </ScrollDepth>
      </div>
    </div>
  );
}
