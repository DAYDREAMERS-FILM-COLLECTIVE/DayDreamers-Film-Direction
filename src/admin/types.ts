/**
 * src/admin/types.ts
 * Type definitions for Admin CMS, Seat Locker, Bookings Roster, and Door Scanner.
 */

export type AdminSection = 'movies' | 'seats' | 'bookings' | 'scanner';

export interface AdminMovie {
  id: string;
  title: string;
  director: string;
  genre: string;
  runtime: string;
  hall: string;
  poster_url?: string;
  blurb?: string;
}

export interface AdminBooking {
  id: string;
  ref_code: string;
  film_title: string;
  user_name: string;
  user_usn: string;
  user_email: string;
  seat_designation: string;
  show_date: string;
  show_time: string;
  hall: string;
  checked_in: boolean;
  checked_in_at?: string;
}

export interface QrCheckInResponse {
  valid: boolean;
  message?: string;
  error?: string;
  attendee?: {
    name: string;
    usn: string;
    seat: string;
    filmTitle: string;
    showTime: string;
    hall: string;
    refCode: string;
    checkedInAt: string;
  };
}
