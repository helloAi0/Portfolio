import React from 'react';
import { prisma } from '@/lib/prisma';
import { HeavenStage, type Honor } from '@/components/honors/HeavenStage';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Achievements & Honors',
  description: 'Awards, rankings and academic honors of Taha Udaipurwala, each shown only with proof and the owner\'s approval.',
};

export const dynamic = 'force-dynamic';

const fmt = (d: Date | null) => (d ? d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null);

export default async function AchievementsPage() {
  let rows: any[] = [];
  try {
    rows = await prisma.achievement.findMany({ where: { isPublic: true, ownerApproved: true }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] });
  } catch { /* database unavailable: the coming-soon sky still renders */ }
  const honors: Honor[] = rows.map((a) => ({ title: a.title, category: a.category, organization: a.organization, dateLabel: fmt(a.date), award: a.rankOrAward, description: a.description, proofUrl: a.proofUrl }));

  return (
    <div>
      <HeavenStage honors={honors} />
      {honors.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="font-serif font-black text-white text-2xl mb-6">All honors</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {rows.map((item) => (
              <Card key={item.id} variant="marble" className="p-6">
                <Badge variant="gold" size="xs" className="mb-2">{item.category}</Badge>
                <h3 className="font-serif font-bold text-lg text-white mb-1">{item.title}</h3>
                <p className="text-xs text-gold-300 font-mono mb-2">{item.organization}</p>
                {item.description && <p className="text-xs text-neutral-400 mb-3">{item.description}</p>}
                {item.rankOrAward && <p className="text-[11px] font-mono text-emerald-400 font-bold mb-2">{item.rankOrAward}</p>}
                {item.proofUrl && <a href={item.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-mono text-gold-400 hover:text-gold-200">View proof <ExternalLink className="w-3.5 h-3.5" /></a>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
