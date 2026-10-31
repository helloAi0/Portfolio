import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ShieldCheck, BookOpen } from 'lucide-react';

export default function ScholarshipsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Scholarships' }]} />

      <SectionHeading
        eyebrow="Benefaction Registry"
        title="Scholarships & Grants"
        description="Institutional scholarships and research endowments."
      />

      <Card variant="marble" className="p-10 text-center max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-imperial-900 border border-gold-500/30 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-gold-400" />
        </div>
        <h3 className="font-serif text-xl font-bold text-white mb-2">
          Strict Verification Registry
        </h3>
        <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-6">
          In adherence to the core imperial integrity directive, no scholarships are invented or listed without authentic grant letters or verifiable donor paperwork.
        </p>
        <div className="p-3 rounded bg-imperial-950 border border-white/5 text-[11px] font-mono text-neutral-400">
          Status: Zero unverified claims • Awaiting official grant notifications
        </div>
      </Card>
    </div>
  );
}
