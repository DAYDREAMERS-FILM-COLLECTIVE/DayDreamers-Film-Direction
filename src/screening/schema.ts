/**
 * src/screening/schema.ts
 * Strict Zod validation schemas for student USN & official @rvu.edu.in emails.
 */

import { z } from 'zod';

export const RVU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(blr\.)?rvu\.edu\.in$/i;
export const RVU_USN_REGEX = /^1RVU\d{2}[A-Z]{3}\d{3}$/i;

export const attendeeSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required (minimum 2 characters)'),
  usn: z
    .string()
    .trim()
    .toUpperCase()
    .regex(RVU_USN_REGEX, 'Enter a valid student USN (e.g. 1RVU24CSE045)'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(RVU_EMAIL_REGEX, 'Must be an official @rvu.edu.in or @blr.rvu.edu.in email address'),
  seat: z.string().min(1, 'Seat designation missing')
});

export const bookingFormSchema = z.object({
  attendees: z
    .array(attendeeSchema)
    .min(1, 'At least one seat must be selected')
    .max(4, 'Group bookings are limited to 4 seats')
    .refine(
      (items) => {
        const usns = new Set(items.map((a) => a.usn.trim().toUpperCase()));
        return usns.size === items.length;
      },
      {
        message: 'Duplicate USN detected. Every attendee must have a unique student USN.',
        path: ['attendees']
      }
    )
    .refine(
      (items) => {
        const emails = new Set(items.map((a) => a.email.trim().toLowerCase()));
        return emails.size === items.length;
      },
      {
        message: 'Duplicate email detected. Each attendee must have a distinct RVU email address.',
        path: ['attendees']
      }
    )
});

export type AttendeeFormValues = z.infer<typeof attendeeSchema>;
export type BookingFormValues = z.infer<typeof bookingFormSchema>;
