export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface SeatItem {
  id: string; // e.g. "A-01"
  showtime_id: string;
  row_label: string;
  seat_number: number;
  tier_id: string;
  status: SeatStatus;
  held_by_session?: string | null;
  expires_at?: string | null;
}

export interface ShowtimeItem {
  id: string;
  movie_id: string;
  title: string;
  start_time: string;
  venue: string;
}

export interface TicketItem {
  id: string;
  showtime_id: string;
  seat_id: string;
  attendee_email: string;
  attendee_usn: string;
  qr_hash: string;
  issued_at: string;
  admitted_at?: string | null;
}

export interface TicketPassPayload {
  ticketId: string;
  showtimeId: string;
  seatId: string;
  movieTitle: string;
  venue: string;
  startTime: string;
  attendeeEmail: string;
  attendeeUsn: string;
  qrHash: string;
  qrDataUrl: string;
}
