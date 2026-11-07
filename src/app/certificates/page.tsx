import React from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { prisma } from '@/lib/prisma';
import { Award, ShieldCheck, CheckCircle2, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CertificatesPage() {
  const certificates = await prisma.certificate.findMany({
    where: { isPublic: true, ownerApproved: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Certificates' }]} />

      <SectionHeading
        eyebrow="Accreditation Vault"
        title="Certificates & Credentials"
        description="Formal certifications verified by issuing authorities and confirmed by the owner."
      />

      {certificates.length === 0 ? (
        <Card variant="marble" className="p-10 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-imperial-900 border border-gold-500/30 flex items-center justify-center mx-auto mb-4">
            <Award className="w-6 h-6 text-gold-400" />
          </div>
          <h3 className="font-serif text-xl font-bold text-white mb-2">
            No Fabricated Credentials
          </h3>
          <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-6">
            Certificates are dynamically streamed from the database and only displayed once cryptographically or institutionally verified and owner-approved.
          </p>
          <div className="p-3 rounded bg-imperial-950 border border-white/5 text-[11px] font-mono text-neutral-400">
            Current Status: Pending upload of official course certificates in Citadel Admin Vault
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <Card key={cert.id} variant="marble" className="p-6 flex flex-col justify-between">
              <div>
                <Badge variant="verified" size="xs" className="mb-2">Verified Credential</Badge>
                <h3 className="font-serif font-bold text-lg text-white mb-1">{cert.title}</h3>
                <p className="text-xs text-gold-300 font-mono mb-2">{cert.issuingOrganization}</p>
                {cert.description && <p className="text-xs text-neutral-400 font-sans mb-3">{cert.description}</p>}
                {cert.credentialId && (
                  <p className="text-[10px] font-mono text-neutral-500 mb-2">ID: {cert.credentialId}</p>
                )}
              </div>
              {cert.credentialUrl && (
                <div className="pt-3 border-t border-white/5">
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs font-mono text-gold-400 hover:text-gold-200"
                  >
                    <span>Verify Credential Authority</span>
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
