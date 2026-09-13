/**
 * RVU Film Production Society (FPS) - Supabase Data Layer
 * 100% Real PostgreSQL & Realtime Connections (Zero Mock Fallbacks).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://ycbmhvtepfbrlmvyoffs.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYm1odnRlcGZicmxtdnlvZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNzg5MzgsImV4cCI6MjEwNDg1NDkzOH0.bvM8tb0NY5iHv19PRbM7E_MO1fS9KbxX5pOirkgTvJ8';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Fetch active screening movies
 */
export async function fetchMovies(includeInactive = false) {
  let query = supabase.from('movies').select('*').order('title', { ascending: true });
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return { data, error: null };
}

/**
 * Fetch showtimes, optionally filtered by movie
 */
export async function fetchShowtimes(movieId = null) {
  let query = supabase.from('showtimes').select('*').order('start_time', { ascending: true });
  if (movieId) {
    query = query.eq('movie_id', movieId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return { data, error: null };
}

/**
 * Fetch 50-seat grid for a showtime with lazy expiration calculation
 */
export async function fetchSeats(showtimeId, sessionId) {
  const { data, error } = await supabase.rpc('get_showtime_seats', {
    p_showtime_id: showtimeId,
    p_session_id: sessionId || null,
  });

  if (error) throw error;
  return { data, error: null };
}

/**
 * Atomic seat lock acquisition RPC
 */
export async function acquireSeatLocks(showtimeId, seatIds, sessionId, holdSeconds = 300) {
  const { data, error } = await supabase.rpc('acquire_seat_locks', {
    p_showtime_id: showtimeId,
    p_seat_ids: seatIds,
    p_session_id: sessionId,
    p_hold_seconds: holdSeconds,
  });

  if (error) throw error;
  return data;
}

/**
 * Release active seat locks RPC
 */
export async function releaseSeatLocks(seatIds, sessionId) {
  if (!seatIds || seatIds.length === 0 || !sessionId) return { success: true };

  const { data, error } = await supabase.rpc('release_seat_locks', {
    p_seat_ids: seatIds,
    p_session_id: sessionId,
  });

  if (error) throw error;
  return data;
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
}

/**
 * Atomic ticket verification for door scanner RPC
 */
export async function verifyTicketAtomic(ticketHash, usn) {
  const { data, error } = await supabase.rpc('verify_ticket_atomic', {
    p_ticket_hash: ticketHash || null,
    p_usn: usn || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Realtime channel subscription for live cross-client seat updates (<100ms)
 */
export function subscribeToSeats(showtimeId, onSeatChange) {
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

// ----------------------------------------------------------------------------
// ADMIN CMS API (Direct Supabase Queries)
// ----------------------------------------------------------------------------

/**
 * Fetch system statistics for the Admin Overview tab
 */
export async function fetchAdminStats() {
  const [moviesRes, showtimesRes, seatsRes, bookingsRes] = await Promise.all([
    supabase.from('movies').select('id', { count: 'exact' }),
    supabase.from('showtimes').select('id, start_time', { count: 'exact' }),
    supabase.from('seats').select('id, status', { count: 'exact' }),
    supabase.from('bookings').select('id, total_amount, checked_in_at', { count: 'exact' }),
  ]);

  const totalSeats = seatsRes.data?.length || 0;
  const bookedSeats = seatsRes.data?.filter((s) => s.status === 'booked').length || 0;
  const occupancyRate = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;

  const totalBookings = bookingsRes.data?.length || 0;
  const totalRevenue = bookingsRes.data?.reduce((sum, b) => sum + Number(b.total_amount || 0), 0) || 0;
  const admittedCount = bookingsRes.data?.filter((b) => b.checked_in_at !== null).length || 0;

  return {
    totalFilms: moviesRes.data?.length || 0,
    activeShowtimes: showtimesRes.data?.length || 0,
    totalBookings,
    totalRevenue,
    occupancyRate,
    admittedCount,
    totalSeats,
    bookedSeats,
  };
}

/**
 * Fetch attendee bookings roster with joined movie and showtime details
 */
export async function fetchAdminBookings(searchTerm = '') {
  let query = supabase
    .from('bookings')
    .select(`
      id,
      user_name,
      usn,
      rvu_email,
      booking_mode,
      total_amount,
      ticket_hash,
      attendees,
      status,
      checked_in_at,
      created_at,
      showtimes (
        id,
        auditorium_name,
        start_time,
        movies (
          id,
          title
        )
      ),
      booking_seats (
        seat_id,
        seats (
          row_label,
          col_number,
          seat_tier
        )
      )
    `)
    .order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    return data.filter(
      (b) =>
        b.user_name.toLowerCase().includes(term) ||
        b.usn.toLowerCase().includes(term) ||
        b.rvu_email.toLowerCase().includes(term) ||
        b.ticket_hash.toLowerCase().includes(term) ||
        b.showtimes?.movies?.title?.toLowerCase().includes(term)
    );
  }

  return data;
}

/**
 * Admin: Add a new movie to catalog
 */
export async function adminCreateMovie(movieData) {
  const { data, error } = await supabase
    .from('movies')
    .insert([
      {
        title: movieData.title.trim(),
        tagline: movieData.tagline?.trim() || '',
        description: movieData.description.trim(),
        poster_url: movieData.poster_url.trim(),
        backdrop_url: movieData.backdrop_url.trim() || movieData.poster_url.trim(),
        trailer_url: movieData.trailer_url?.trim() || '',
        duration_mins: parseInt(movieData.duration_mins, 10),
        genre: movieData.genre.trim(),
        age_rating: movieData.age_rating || 'UA',
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: Update movie details
 */
export async function adminUpdateMovie(movieId, updates) {
  const { data, error } = await supabase
    .from('movies')
    .update(updates)
    .eq('id', movieId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: Toggle archive status of a movie
 */
export async function adminArchiveMovie(movieId, isActive) {
  const { data, error } = await supabase
    .from('movies')
    .update({ is_active: isActive })
    .eq('id', movieId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: Create a new showtime and automatically provision its 50 seats
 */
export async function adminCreateShowtime(showtimeData) {
  const { data, error } = await supabase.rpc('admin_create_showtime', {
    p_movie_id: showtimeData.movie_id,
    p_auditorium_name: showtimeData.auditorium_name,
    p_start_time: showtimeData.start_time,
    p_price_regular: parseFloat(showtimeData.price_regular) || 150.0,
    p_price_vip: parseFloat(showtimeData.price_vip) || 250.0,
  });

  if (error) throw error;
  return data;
}

/**
 * Admin: Manual one-click check in for a booking
 */
export async function adminCheckInBooking(bookingId) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ checked_in_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
