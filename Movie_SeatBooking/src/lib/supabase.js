/**
 * RVU Campus Cinema - Supabase Unified Client & Realtime Layer
 * Seamlessly communicates with Supabase PostgreSQL and Realtime Channels,
 * with resilient automatic fallback to local preview mode if credentials are unset.
 */

import { createClient } from '@supabase/supabase-js';
import {
  MOCK_MOVIES,
  MOCK_SHOWTIMES,
  getMockSeats,
  acquireMockSeatLocks,
  releaseMockSeatLocks,
  confirmMockBookingAtomic,
  verifyMockTicketAtomic,
} from './mockData.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Fetch all active screening movies
 */
export async function fetchMovies() {
  if (!isSupabaseConfigured) {
    return { data: MOCK_MOVIES, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (error) throw error;
    return { data: data && data.length > 0 ? data : MOCK_MOVIES, error: null };
  } catch (err) {
    console.warn('[Supabase] fetchMovies fallback to local data:', err.message);
    return { data: MOCK_MOVIES, error: null };
  }
}

/**
 * Fetch showtimes, optionally filtered by movie
 */
export async function fetchShowtimes(movieId = null) {
  if (!isSupabaseConfigured) {
    const filtered = movieId
      ? MOCK_SHOWTIMES.filter((s) => s.movie_id === movieId)
      : MOCK_SHOWTIMES;
    return { data: filtered, error: null };
  }

  try {
    let query = supabase
      .from('showtimes')
      .select('*')
      .order('start_time', { ascending: true });

    if (movieId) {
      query = query.eq('movie_id', movieId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data && data.length > 0 ? data : MOCK_SHOWTIMES, error: null };
  } catch (err) {
    console.warn('[Supabase] fetchShowtimes fallback to local data:', err.message);
    const filtered = movieId
      ? MOCK_SHOWTIMES.filter((s) => s.movie_id === movieId)
      : MOCK_SHOWTIMES;
    return { data: filtered, error: null };
  }
}

/**
 * Fetch 64-seat grid for a showtime with lazy expiration calculation
 */
export async function fetchSeats(showtimeId, sessionId) {
  if (!isSupabaseConfigured) {
    return { data: getMockSeats(showtimeId, sessionId), error: null };
  }

  try {
    // Call the database function that evaluates lazy expiration
    const { data, error } = await supabase.rpc('get_showtime_seats', {
      p_showtime_id: showtimeId,
      p_session_id: sessionId || null,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.warn('[Supabase] get_showtime_seats fallback to local data:', err.message);
    return { data: getMockSeats(showtimeId, sessionId), error: null };
  }
}

/**
 * Atomic seat lock acquisition RPC
 */
export async function acquireSeatLocks(showtimeId, seatIds, sessionId, holdSeconds = 300) {
  if (!isSupabaseConfigured) {
    return acquireMockSeatLocks(showtimeId, seatIds, sessionId, holdSeconds);
  }

  try {
    const { data, error } = await supabase.rpc('acquire_seat_locks', {
      p_showtime_id: showtimeId,
      p_seat_ids: seatIds,
      p_session_id: sessionId,
      p_hold_seconds: holdSeconds,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] acquire_seat_locks fallback to local simulation:', err.message);
    return acquireMockSeatLocks(showtimeId, seatIds, sessionId, holdSeconds);
  }
}

/**
 * Release active seat locks RPC
 */
export async function releaseSeatLocks(seatIds, sessionId) {
  if (!seatIds || seatIds.length === 0 || !sessionId) return { success: true };

  if (!isSupabaseConfigured) {
    return releaseMockSeatLocks(seatIds, sessionId);
  }

  try {
    const { data, error } = await supabase.rpc('release_seat_locks', {
      p_seat_ids: seatIds,
      p_session_id: sessionId,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] release_seat_locks fallback to local simulation:', err.message);
    return releaseMockSeatLocks(seatIds, sessionId);
  }
}

/**
 * Atomic booking confirmation RPC
 */
export async function confirmBookingAtomic({
  showtimeId,
  seatIds,
  sessionId,
  userName,
  usn,
  email,
  ticketHash,
  attendees = [],
}) {
  if (!isSupabaseConfigured) {
    return confirmMockBookingAtomic({
      showtimeId,
      seatIds,
      sessionId,
      userName,
      usn,
      email,
      ticketHash,
      attendees,
    });
  }

  try {
    const { data, error } = await supabase.rpc('confirm_booking_atomic', {
      p_showtime_id: showtimeId,
      p_seat_ids: seatIds,
      p_session_id: sessionId,
      p_user_name: userName,
      p_usn: usn,
      p_email: email,
      p_ticket_hash: ticketHash,
      p_attendees: attendees,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] confirm_booking_atomic fallback:', err.message);
    return confirmMockBookingAtomic({
      showtimeId,
      seatIds,
      sessionId,
      userName,
      usn,
      email,
      ticketHash,
      attendees,
    });
  }
}

/**
 * Atomic ticket verification for door scanner RPC
 */
export async function verifyTicketAtomic(ticketHash, usn) {
  if (!isSupabaseConfigured) {
    return verifyMockTicketAtomic(ticketHash, usn);
  }

  try {
    const { data, error } = await supabase.rpc('verify_ticket_atomic', {
      p_ticket_hash: ticketHash || null,
      p_usn: usn || null,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[Supabase] verify_ticket_atomic fallback:', err.message);
    return verifyMockTicketAtomic(ticketHash, usn);
  }
}

/**
 * Realtime channel subscription for live cross-client updates (<100ms)
 */
export function subscribeToSeats(showtimeId, onSeatChange) {
  if (!isSupabaseConfigured || !supabase) {
    // In mock mode, window custom event simulates cross-component sync
    const handleMockSync = (e) => {
      if (e.detail && e.detail.showtimeId === showtimeId) {
        onSeatChange(e.detail);
      }
    };
    window.addEventListener('rvu_cinema_seat_change', handleMockSync);
    return () => window.removeEventListener('rvu_cinema_seat_change', handleMockSync);
  }

  const channel = supabase
    .channel(`seats-${showtimeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'seats',
        filter: `showtime_id=eq.${showtimeId}`,
      },
      (payload) => {
        onSeatChange(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
