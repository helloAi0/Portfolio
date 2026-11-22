import React from 'react';
import { prisma } from '@/lib/prisma';
import { CertificateStage, type Cert } from '@/components/certificates/CertificateStage';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Certificates',
  description: 'Certificates of Taha Udaipurwala, each shown only when real and approved by the owner.',
};

export const dynamic = 'force-dynamic';

const fmt = (d: Date | null) => (d ? d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null);

export default async function CertificatesPage() {
  let rows: any[] = [];
  try {
    rows = await prisma.certificate.findMany({ where: { isPublic: true, ownerApproved: true }, orderBy: [{ issueDate: 'asc' }, { createdAt: 'asc' }] });
  } catch { /* database unavailable: the coming-soon hall still renders */ }
  const certs: Cert[] = rows.map((c) => ({ title: c.title, org: c.issuingOrganization, dateLabel: fmt(c.issueDate), credentialId: c.credentialId, verified: c.verificationStatus === 'VERIFIED', description: c.description, fileUrl: c.filePath, verifyUrl: c.credentialUrl }));

  return (
    <div>
      <CertificateStage certs={certs} />
      {rows.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="font-serif font-black text-white text-2xl mb-6">All certificates</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {rows.map((cert) => (
              <Card key={cert.id} variant="marble" className="p-6">
                <Badge variant={cert.verificationStatus === 'VERIFIED' ? 'verified' : 'neutral'} size="xs" className="mb-2">{cert.verificationStatus === 'VERIFIED' ? 'Verified Credential' : 'Listed by owner'}</Badge>
                <h3 className="font-serif font-bold text-lg text-white mb-1">{cert.title}</h3>
                <p className="text-xs text-gold-300 font-mono mb-2">{cert.issuingOrganization}</p>
                {cert.description && <p className="text-xs text-neutral-400 mb-3">{cert.description}</p>}
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {cert.filePath && <a href={cert.filePath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-mono text-gold-400 hover:text-gold-200">View certificate <ExternalLink className="w-3.5 h-3.5" /></a>}
                  {cert.credentialUrl && <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-mono text-gold-400 hover:text-gold-200">Verify with issuer <ExternalLink className="w-3.5 h-3.5" /></a>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
