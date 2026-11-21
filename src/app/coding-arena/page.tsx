import React from 'react';
import { CodingStage, type Platform } from '@/components/coding/CodingStage';

export const metadata = {
  title: 'Coding Arena',
  description: "Taha Udaipurwala's LeetCode and GeeksforGeeks profiles.",
};

// The owner's public profile pages, exactly as supplied. Nothing is scraped or estimated here.
const PLATFORMS: [Platform, Platform] = [
  { name: 'LeetCode', handle: 'WLq0hyCLJz', href: 'https://leetcode.com/u/WLq0hyCLJz/', glyph: '{ }', blurb: 'Algorithms and data-structure practice.' },
  { name: 'GeeksforGeeks', handle: 'tahaudaip7eby', href: 'https://www.geeksforgeeks.org/profile/tahaudaip7eby?from=explore&tab=activity', glyph: 'GfG', blurb: 'Problem solving, practice and learning streaks.' },
];

export default function CodingArenaPage() {
  return <CodingStage platforms={PLATFORMS} />;
}
