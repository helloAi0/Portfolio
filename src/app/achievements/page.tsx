import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { prisma } from '@/lib/prisma';
import { Trophy, ShieldCheck, Award, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AchievementsPage() {
  const achievements = await prisma.achievement.findMany({
    where: { isPublic: true, ownerApproved: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Achievements' }]} />

      <SectionHeading
        eyebrow="Verified Laurels"
        title="Achievements & Honors"
        description="Authentic record of competitive recognition, hackathons, and academic honors. Strictly evidence-based."
      />

      {achievements.length === 0 ? (
        <Card variant="marble" className="p-10 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-imperial-900 border border-gold-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-gold-400" />
          </div>
          <h3 className="font-serif text-xl font-bold text-white mb-2">
            Evidence-Based Vault Active
          </h3>
          <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-6">
            In strict compliance with Project LAMO’s anti-fabrication directive, no awards, hackathon rankings, or academic honors are published without verifiable institutional proof and explicit owner approval.
          </p>
          <div className="p-3 rounded bg-imperial-950 border border-white/5 text-[11px] font-mono text-neutral-400">
            Database Record Count: 0 • Awaiting Verified Transcript Entries via Citadel Admin Desk
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {achievements.map((item) => (
            <Card key={item.id} variant="marble" className="p-6 flex flex-col justify-between">
              <div>
                <Badge variant="gold" size="xs" className="mb-2">{item.category}</Badge>
                <h3 className="font-serif font-bold text-lg text-white mb-1">{item.title}</h3>
                <p className="text-xs text-gold-300 font-mono mb-2">{item.organization}</p>
                {item.description && <p className="text-xs text-neutral-400 font-sans mb-3">{item.description}</p>}
                {item.rankOrAward && (
                  <p className="text-[11px] font-mono text-emerald-400 font-bold mb-2">Award: {item.rankOrAward}</p>
                )}
              </div>
              {item.proofUrl && (
                <div className="pt-3 border-t border-white/5">
                  <a
                    href={item.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs font-mono text-gold-400 hover:text-gold-200"
                  >
                    <span>View Proof Document</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
