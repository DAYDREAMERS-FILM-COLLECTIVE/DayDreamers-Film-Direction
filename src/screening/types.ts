/**
 * src/screening/types.ts
 * Core domain types for the self-contained Screening module.
 */

export type BookingMode = 'individual' | 'group';

export type SeatTier = 'Front' | 'Prime' | 'Recliner';

export interface Movie {
  id: string;
  title: string;
  rawTitle: string;
  dir: string;
  rawDir: string;
  genre: string;
  runtime: string;
  year: number;
  rating: 'U' | 'UA' | 'A';
  hall: string;
  blurb: string;
  poster_url: string;
  gradient: [string, string, string];
  glyph: string;
}

export interface Showing {
  id: string;
  movieId?: string;
  date: string | Date;
  dayNum: number;
  monthStr: string;
  fullDateStr: string;
  time: string;
  hall: string;
}

export interface AttendeeInput {
  name: string;
  usn: string;
  email: string;
  seat: string;
}

export interface BookingPayload {
  showingId: string;
  showing_id: string;
  bookingMode: BookingMode;
  attendees: AttendeeInput[];
}

export interface ConfirmedPass {
  id?: string;
  refCode: string;
  filmTitle: string;
  userName: string;
  userUsn: string;
  userEmail: string;
  showDate: string;
  showTime: string;
  hall: string;
  seat: string;
  seats?: string[] | string;
  qrDataUri: string;
}

export interface BookingApiResponse {
  ok: boolean;
  status: number;
  data: {
    message?: string;
    error?: string;
    booking?: ConfirmedPass;
    bookings?: ConfirmedPass[];
  };
}
