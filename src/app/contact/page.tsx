import React from 'react';
import { ContactStudio } from '@/components/contact/ContactStudio';
import { PROFILE } from '@/config/profile';

export const metadata = {
  title: 'Contact',
  description: 'Write to Taha Udaipurwala about an opportunity, a collaboration or his work.',
};

export default function ContactPage() {
  return <ContactStudio email={PROFILE.contactEmail} github={PROFILE.github.url} linkedin={PROFILE.linkedinUrl} location={PROFILE.location} />;
}
