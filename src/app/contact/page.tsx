'use client';

import React, { useState } from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Mail, Send, CheckCircle2, AlertCircle, ShieldAlert, MapPin, Github, Linkedin, Lock } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    senderName: '',
    senderEmail: '',
    subject: '',
    message: '',
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to transmit message.');
      }

      setStatus('success');
      setFormData({ senderName: '', senderEmail: '', subject: '', message: '' });
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Breadcrumbs items={[{ label: 'Contact & Transmissions' }]} />

      <SectionHeading
        eyebrow="Communication Channel"
        title="Transmit Direct Message"
        description="Establish encrypted correspondence for research inquiries, autonomous robotics collaborations, or architectural engineering consultations."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Left Column: Direct Coordinates & Identity Flag */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="marble" className="p-8 space-y-6">
            <h3 className="font-serif font-bold text-xl text-white">
              Citadel Coordinates
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-start space-x-3">
                <Mail className="w-4 h-4 text-gold-400 mt-0.5" />
                <div>
                  <span className="text-neutral-400 block uppercase text-[10px]">Configured Contact Email</span>
                  <a
                    href="mailto:tahaudaipurwala68@gmail.com"
                    className="text-gold-300 hover:underline break-all"
                  >
                    tahaudaipurwala68@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-gold-400 mt-0.5" />
                <div>
                  <span className="text-neutral-400 block uppercase text-[10px]">Location Base</span>
                  <span className="text-neutral-200">Kolkata, West Bengal, India</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Github className="w-4 h-4 text-gold-400 mt-0.5" />
                <div>
                  <span className="text-neutral-400 block uppercase text-[10px]">GitHub Repository</span>
                  <a
                    href="https://github.com/helloAi0/Portfolio.git"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-200 hover:text-gold-300"
                  >
                    github.com/helloAi0
                  </a>
                </div>
              </div>
            </div>

            {/* Identity Guardrail Verification Notice */}
            <div className="p-4 rounded bg-imperial-950 border border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-mono text-[11px] font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>Identity Isolation Guardrail Active</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Display: <strong className="text-white">Sahil Depurwala</strong>
                <br />
                Mailbox: <strong className="text-gold-300">tahaudaipurwala68@gmail.com</strong>
              </p>
              <p className="text-[10px] text-amber-200/80 leading-normal">
                Discrepancy notice: Both fields are maintained in separate configuration entries pending final owner validation.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Interactive Contact Form */}
        <div className="lg:col-span-7">
          <Card variant="marble" className="p-8">
            <h3 className="font-serif font-bold text-xl text-white mb-2">
              Dispatch Secure Enquiry
            </h3>
            <p className="text-xs text-neutral-400 mb-6 font-mono">
              Transmissions are recorded to the central database and flagged for review.
            </p>

            {status === 'success' && (
              <div className="p-4 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono mb-6 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Transmission successfully received and recorded to the database.</span>
              </div>
            )}

            {status === 'error' && (
              <div className="p-4 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono mb-6 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage || 'Failed to transmit signal. Please try again.'}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase text-[10px] block">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.senderName}
                    onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                    placeholder="e.g. Commander Marcus"
                    className="w-full px-3.5 py-2.5 rounded bg-imperial-900 border border-gold-500/20 text-white placeholder-neutral-600 focus:outline-none focus:border-gold-400 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase text-[10px] block">
                    Your Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.senderEmail}
                    onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                    placeholder="commander@enterprise.org"
                    className="w-full px-3.5 py-2.5 rounded bg-imperial-900 border border-gold-500/20 text-white placeholder-neutral-600 focus:outline-none focus:border-gold-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 uppercase text-[10px] block">
                  Subject / Domain
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Autonomous SLAM Research Collaboration"
                  className="w-full px-3.5 py-2.5 rounded bg-imperial-900 border border-gold-500/20 text-white placeholder-neutral-600 focus:outline-none focus:border-gold-400 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 uppercase text-[10px] block">
                  Transmission Payload *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Detail your inquiry, project scope, or research topic..."
                  className="w-full px-3.5 py-2.5 rounded bg-imperial-900 border border-gold-500/20 text-white placeholder-neutral-600 focus:outline-none focus:border-gold-400 transition-colors resize-none"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={status === 'loading'}
                  variant="primary"
                  size="md"
                  className="w-full"
                  icon={<Send className="w-4 h-4" />}
                >
                  {status === 'loading' ? 'Transmitting Signal...' : 'Transmit Signal'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

