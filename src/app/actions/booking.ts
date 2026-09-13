'use server';

import { supabase } from '@/lib/supabase/client';
import { generateTicketHash, verifyTicketHash } from '@/lib/crypto';
import QRCode from 'qrcode';
import { TicketPassPayload } from '@/types';
import { MOVIE_CATALOG } from '@/config/movies.schema';

interface ConfirmBookingParams {
  showtimeId: string;
  seatIds: string[];
  attendeeEmail: string;
  attendeeUsn: string;
  sessionId: string;
}

export async function confirmBookingAction(params: ConfirmBookingParams): Promise<{
  success: boolean;
  tickets?: TicketPassPayload[];
  error?: string;
}> {
  const { showtimeId, seatIds, attendeeEmail, attendeeUsn, sessionId } = params;

  if (!seatIds.length || !attendeeEmail || !attendeeUsn || !sessionId) {
    return { success: false, error: 'Missing mandatory booking attributes.' };
  }

  // Strict email & USN validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(attendeeEmail)) {
    return { success: false, error: 'Invalid email address provided.' };
  }

  const usnClean = attendeeUsn.trim().toUpperCase();
  if (usnClean.length < 4) {
    return { success: false, error: 'Invalid Student USN / ID provided.' };
  }

  try {
    // 1. Prepare Cryptographic HMAC-SHA256 Tickets
    const ticketPayloads = await Promise.all(
      seatIds.map(async (seatId) => {
        const ticketId = crypto.randomUUID();
        const qrHash = generateTicketHash(ticketId, showtimeId, seatId);
        
        // Find movie and showtime metadata for ticket
        let movieTitle = 'FPS CINEMA SCREENING';
        let venue = 'FPS Auditorium';
        let startTime = '2026-09-20 19:00 IST';

        for (const m of MOVIE_CATALOG) {
          const st = m.showtimes.find((s) => s.id === showtimeId);
          if (st) {
            movieTitle = m.title;
            venue = st.venue;
            startTime = st.timeLabel;
            break;
          }
        }

        const qrString = JSON.stringify({
          ticketId,
          showtimeId,
          seatId,
          hash: qrHash,
        });

        const qrDataUrl = await QRCode.toDataURL(qrString, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 280,
          color: {
            dark: '#030407',
            light: '#ffffff',
          },
        });

        return {
          id: ticketId,
          seat_id: seatId,
          qr_hash: qrHash,
          qrDataUrl,
          movieTitle,
          venue,
          startTime,
        };
      })
    );

    // 2. Execute Atomic Supabase RPC (Transitions HELD -> BOOKED and inserts Tickets)
    const { data, error: rpcError } = await supabase.rpc('confirm_booking_atomic', {
      p_seat_ids: seatIds,
      p_showtime_id: showtimeId,
      p_session_id: sessionId,
      p_attendee_email: attendeeEmail,
      p_attendee_usn: usnClean,
      p_ticket_payloads: ticketPayloads.map((t) => ({
        id: t.id,
        seat_id: t.seat_id,
        qr_hash: t.qr_hash,
      })),
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.message || data?.error || 'Atomic booking confirmation failed.' };
    }

    // 3. Assemble User-Facing 35mm Ticket Passes
    const passes: TicketPassPayload[] = ticketPayloads.map((t) => ({
      ticketId: t.id,
      showtimeId,
      seatId: t.seat_id,
      movieTitle: t.movieTitle,
      venue: t.venue,
      startTime: t.startTime,
      attendeeEmail,
      attendeeUsn: usnClean,
      qrHash: t.qr_hash,
      qrDataUrl: t.qrDataUrl,
    }));

    return { success: true, tickets: passes };
  } catch (err: unknown) {
    console.error('Server action confirmBookingAction error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server booking exception' };
  }
}

export async function verifyTicketAction(params: {
  ticketId: string;
  showtimeId: string;
  seatId: string;
  qrHash: string;
  adminKey?: string;
}): Promise<{
  success: boolean;
  code: string;
  message: string;
  ticket?: {
    id: string;
    seat_id: string;
    movie_title: string;
    venue: string;
    attendee_email: string;
    attendee_usn: string;
    admitted_at?: string;
  };
}> {
  const { ticketId, showtimeId, seatId, qrHash, adminKey } = params;

  // Verify Admin Access
  const serverAdminKey = process.env.ADMIN_ACCESS_KEY || 'fps-door-admin-alpha-2026';
  if (adminKey && adminKey !== serverAdminKey) {
    return {
      success: false,
      code: 'UNAUTHORIZED_ADMIN',
      message: 'Invalid administrative door credentials.',
    };
  }

  // 1. Constant-time cryptographic HMAC verification
  const isValidHmac = verifyTicketHash(ticketId, showtimeId, seatId, qrHash);
  if (!isValidHmac) {
    return {
      success: false,
      code: 'FORGED_SIGNATURE',
      message: 'HMAC signature verification failed. Counterfeit ticket detected.',
    };
  }

  // 2. Invoke Atomic Supabase Admission RPC
  try {
    const { data, error } = await supabase.rpc('verify_ticket_admit', {
      p_ticket_id: ticketId,
      p_qr_hash: qrHash,
    });

    if (error) {
      return { success: false, code: 'RPC_ERROR', message: error.message };
    }

    return data;
  } catch (err: unknown) {
    return {
      success: false,
      code: 'SERVER_EXCEPTION',
      message: err instanceof Error ? err.message : 'Unknown admission error',
    };
  }
}
