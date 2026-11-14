import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendOwnerEnquiryNotification } from '@/lib/lamo/emailAdapter';

export interface CreateEnquiryInput {
  senderName?: string;
  senderEmail: string;
  senderPhone?: string;
  subject?: string;
  message?: string;
  honeypot?: string;
  ipAddress?: string;
  userAgent?: string;
}

// In-memory rate limiting map: ip -> array of submission timestamps
const enquiryRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENQUIRIES_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = enquiryRateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_ENQUIRIES_PER_WINDOW) {
    enquiryRateLimitMap.set(ip, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  enquiryRateLimitMap.set(ip, validTimestamps);
  return false;
}

export async function submitVisitorEnquiry(input: CreateEnquiryInput) {
  try {
    // 1. Spam protection via honeypot field
    if (input.honeypot && input.honeypot.trim().length > 0) {
      logger.warn('enquiryService.honeypotTriggered', 'Bot trap triggered, silently rejecting transmission');
      return { success: true, enquiryId: 'filtered-spam-trap' };
    }

    // 2. IP Rate limiting
    const ip = input.ipAddress || '127.0.0.1';
    if (isRateLimited(ip)) {
      throw new Error('Transmission frequency limit reached. Please wait a few minutes before transmitting again.');
    }

    // 3. Email validation (mandatory field)
    if (!input.senderEmail || typeof input.senderEmail !== 'string') {
      throw new Error('A valid email address is required to establish communication.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = input.senderEmail.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Invalid email address format.');
    }

    // 4. Fallback defaults for optional fields (allows submission with only email)
    const cleanName = input.senderName?.trim() || 'Anonymous Visitor';
    const cleanSubject = input.subject?.trim() || 'General Engineering Inquiry';
    const cleanMessage = input.message?.trim() || 'Visitor initiated contact transmission with email address.';
    const cleanPhone = input.senderPhone?.trim() || null;

    // 5. Store in database
    const enquiry = await prisma.visitorEnquiry.create({
      data: {
        senderName: cleanName.slice(0, 100),
        senderEmail: cleanEmail,
        senderPhone: cleanPhone ? cleanPhone.slice(0, 30) : null,
        subject: cleanSubject.slice(0, 200),
        message: cleanMessage.slice(0, 5000),
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent ? input.userAgent.slice(0, 255) : null,
      },
    });

    // 6. Asynchronously notify the portfolio owner
    sendOwnerEnquiryNotification({
      enquiryId: enquiry.id,
      senderName: cleanName,
      senderEmail: cleanEmail,
      senderPhone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
    }).catch((err) => {
      logger.error('enquiryService.NotificationError', err as Error);
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
