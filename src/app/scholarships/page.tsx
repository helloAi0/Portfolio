import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { BookOpen } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Scholarships & Grants' };

export default async function ScholarshipsPage() {
  // Entries come from Achievements whose category mentions scholarship, grant or fellowship (owner-entered only).
  const rows = await prisma.achievement
    .findMany({ where: { isPublic: true }, orderBy: { date: 'desc' } })
    .then((all) => all.filter((a) => /scholar|grant|fellowship|stipend/i.test(a.category)))
    .catch(() => []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Scholarships' }]} />
      <SectionHeading eyebrow="Recognition" title="Scholarships & Grants" description="Only scholarships and grants the owner has entered and can document." />

      {rows.length === 0 ? (
        <Card variant="marble" className="p-10 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-imperial-900 border border-gold-500/30 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-gold-400" />
          </div>
          <h3 className="font-serif text-xl font-bold text-white mb-2">Nothing listed yet</h3>
          <p className="text-xs text-neutral-300 leading-relaxed">No scholarship or grant has been added. Nothing is listed here unless it is real and documented.</p>
        </Card>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {rows.map((a) => (
            <Card key={a.id} variant="marble" className="p-6">
              <h3 className="font-serif text-lg font-bold text-white">{a.title}</h3>
              <p className="text-xs font-mono text-gold-300 mt-1">{a.organization}{a.date ? ` · ${new Date(a.date).getFullYear()}` : ''}</p>
              {a.description && <p className="text-sm text-neutral-300 mt-3">{a.description}</p>}
              {a.proofUrl && <a href={a.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-gold-300 hover:text-gold-200">View proof</a>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
