import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface CreateEnquiryInput {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function submitVisitorEnquiry(input: CreateEnquiryInput) {
  try {
    if (!input.senderName || !input.senderEmail || !input.message) {
      throw new Error('Name, email and message are mandatory fields.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.senderEmail)) {
      throw new Error('Invalid email address format.');
    }

    const enquiry = await prisma.visitorEnquiry.create({
      data: {
        senderName: input.senderName.trim(),
        senderEmail: input.senderEmail.trim().toLowerCase(),
        subject: input.subject.trim() || 'General Engineering Inquiry',
        message: input.message.trim(),
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });

    logger.info('enquiryService.submitVisitorEnquiry', 'New visitor enquiry saved', {
      id: enquiry.id,
      email: enquiry.senderEmail,
    });

    return { success: true, enquiryId: enquiry.id };
  } catch (error) {
    logger.error('enquiryService.submitVisitorEnquiry', error as Error);
    return { success: false, error: (error as Error).message };
  }
}

