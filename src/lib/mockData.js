/**
 * RVU Campus Cinema - Local Preview Mock Data & Concurrency Simulation Engine
 * Matches Phase 1 Supabase Database Schema, Indexes & Concurrency RPCs 1:1.
 */

export const MOCK_MOVIES = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Oppenheimer',
    tagline: 'The world forever changes.',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1578836537282-3171d77f8632?q=80&w=1600&auto=format&fit=crop',
    trailer_url: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    duration_mins: 180,
    genre: 'Biography / Drama / History',
    age_rating: 'A',
    is_active: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Interstellar',
    tagline: 'Mankind was born on Earth. It was never meant to die here.',
    description: 'When Earth faces environmental collapse, a team of interstellar explorers travel through a wormhole near Saturn in search of a new home for humanity.',
    poster_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1600&auto=format&fit=crop',
    trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    duration_mins: 169,
    genre: 'Sci-Fi / Adventure / Drama',
    age_rating: 'UA',
    is_active: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Spider-Man: Across the Spider-Verse',
    tagline: "It's how you wear the mask that matters.",
    description: 'Miles Morales is catapulted across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
    poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800&auto=format&fit=crop',
    backdrop_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1600&auto=format&fit=crop',
    trailer_url: 'https://www.youtube.com/watch?v=cqGjhVJWtEg',
    duration_mins: 140,
    genre: 'Animation / Action / Adventure',
    age_rating: 'U',
    is_active: true,
  },
];

const now = new Date();
const todayDateStr = now.toISOString().split('T')[0];

const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

const dayAfter = new Date(now);
dayAfter.setDate(dayAfter.getDate() + 2);
const dayAfterDateStr = dayAfter.toISOString().split('T')[0];

export const MOCK_SHOWTIMES = [
  // Oppenheimer Showtimes
  {
    id: 'sh-opp-1',
    movie_id: '11111111-1111-4111-8111-111111111111',
    auditorium_name: 'Campus Audi 1 - Main Stage',
    start_time: `${todayDateStr}T14:30:00+05:30`,
    price_regular: 150.00,
    price_vip: 250.00,
  },
  {
    id: 'sh-opp-2',
    movie_id: '11111111-1111-4111-8111-111111111111',
    auditorium_name: 'Campus Audi 1 - Main Stage',
    start_time: `${todayDateStr}T18:30:00+05:30`,
    price_regular: 180.00,
    price_vip: 280.00,
  },
  {
    id: 'sh-opp-3',
    movie_id: '11111111-1111-4111-8111-111111111111',
    auditorium_name: 'Campus Audi 2 - Film Lab',
    start_time: `${tomorrowDateStr}T17:00:00+05:30`,
    price_regular: 140.00,
    price_vip: 240.00,
  },

  // Interstellar Showtimes
  {
    id: 'sh-int-1',
    movie_id: '22222222-2222-4222-8222-222222222222',
    auditorium_name: 'Campus Audi 1 - Main Stage',
    start_time: `${todayDateStr}T21:00:00+05:30`,
    price_regular: 160.00,
    price_vip: 260.00,
  },
  {
    id: 'sh-int-2',
    movie_id: '22222222-2222-4222-8222-222222222222',
    auditorium_name: 'Campus Audi 2 - Film Lab',
    start_time: `${tomorrowDateStr}T13:30:00+05:30`,
    price_regular: 140.00,
    price_vip: 240.00,
  },

  // Spider-Man Showtimes
  {
    id: 'sh-spm-1',
    movie_id: '33333333-3333-4333-8333-333333333333',
    auditorium_name: 'Campus Audi 2 - Film Lab',
    start_time: `${todayDateStr}T16:00:00+05:30`,
    price_regular: 130.00,
    price_vip: 220.00,
  },
  {
    id: 'sh-spm-2',
    movie_id: '33333333-3333-4333-8333-333333333333',
    auditorium_name: 'Campus Audi 1 - Main Stage',
    start_time: `${tomorrowDateStr}T19:30:00+05:30`,
    price_regular: 150.00,
    price_vip: 250.00,
  },
  {
    id: 'sh-spm-3',
    movie_id: '33333333-3333-4333-8333-333333333333',
    auditorium_name: 'Campus Audi 1 - Main Stage',
    start_time: `${dayAfterDateStr}T15:00:00+05:30`,
    price_regular: 150.00,
    price_vip: 250.00,
  },
];

// Generate 64-seat grid (Rows A-H, Cols 1-8)
function generate64Seats(showtimeId) {
  const seats = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  rows.forEach((row) => {
    const isVip = row === 'G' || row === 'H';
    for (let col = 1; col <= 8; col++) {
      const seatId = `${showtimeId}-${row}${col}`;
      // Demo: pre-book D4 & D5 for visual realism
      const isBooked = (row === 'D' && (col === 4 || col === 5));
      seats.push({
        id: seatId,
        showtime_id: showtimeId,
        row_label: row,
        col_number: col,
        seat_tier: isVip ? 'vip' : 'regular',
        status: isBooked ? 'booked' : 'available',
        locked_until: null,
        locked_by_session: null,
      });
    }
  });
  return seats;
}

// In-Memory Global Mock Store for Fallback Mode
const inMemorySeats = {};
MOCK_SHOWTIMES.forEach((st) => {
  inMemorySeats[st.id] = generate64Seats(st.id);
});

export const inMemoryBookings = [];

/**
 * In-memory implementation of get_showtime_seats with lazy lock expiration
 */
export function getMockSeats(showtimeId, sessionId) {
  if (!inMemorySeats[showtimeId]) {
    inMemorySeats[showtimeId] = generate64Seats(showtimeId);
  }

  const nowMs = Date.now();
  return inMemorySeats[showtimeId].map((seat) => {
    let effectiveStatus = seat.status;
    let isMyLock = false;

    if (seat.status === 'booked') {
      effectiveStatus = 'booked';
    } else if (seat.status === 'locked') {
      const lockExpiry = seat.locked_until ? new Date(seat.locked_until).getTime() : 0;
      if (lockExpiry >= nowMs) {
        if (sessionId && seat.locked_by_session === sessionId) {
          effectiveStatus = 'selected_by_me';
          isMyLock = true;
        } else {
          effectiveStatus = 'locked_by_other';
        }
      } else {
        // Lazy expiration: lock expired!
        effectiveStatus = 'available';
      }
    } else {
      effectiveStatus = 'available';
    }

    return {
      ...seat,
      effective_status: effectiveStatus,
      is_my_lock: isMyLock,
    };
  });
}

/**
 * In-memory implementation of acquire_seat_locks
 */
export function acquireMockSeatLocks(showtimeId, seatIds, sessionId, holdSeconds = 300) {
  if (!seatIds || seatIds.length === 0) {
    return { success: false, error: 'No seats selected' };
  }
  if (!sessionId) {
    return { success: false, error: 'Session ID required' };
  }

  const seats = inMemorySeats[showtimeId] || [];
  const nowMs = Date.now();
  const expiryTime = new Date(nowMs + holdSeconds * 1000).toISOString();

  // Verify all seats exist and are available or already held by me or expired
  for (const seatId of seatIds) {
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) {
      return { success: false, error: 'Seat not found' };
    }
    if (seat.status === 'booked') {
      return { success: false, error: `Seat ${seat.row_label}${seat.col_number} has already been booked` };
    }
    if (seat.status === 'locked') {
      const lockExpiry = seat.locked_until ? new Date(seat.locked_until).getTime() : 0;
      if (lockExpiry >= nowMs && seat.locked_by_session !== sessionId) {
        return { success: false, error: `Seat ${seat.row_label}${seat.col_number} is held by another student` };
      }
    }
  }

  // Lock all seats
  for (const seatId of seatIds) {
    const seat = seats.find((s) => s.id === seatId);
    if (seat) {
      seat.status = 'locked';
      seat.locked_by_session = sessionId;
      seat.locked_until = expiryTime;
    }
  }

  return {
    success: true,
    locked_count: seatIds.length,
    locked_until: expiryTime,
    session_id: sessionId,
  };
}

/**
 * In-memory implementation of release_seat_locks
 */
export function releaseMockSeatLocks(seatIds, sessionId) {
  if (!sessionId || !seatIds) return { success: true, released_count: 0 };
  let count = 0;

  Object.values(inMemorySeats).forEach((seatList) => {
    seatList.forEach((seat) => {
      if (seatIds.includes(seat.id) && seat.locked_by_session === sessionId && seat.status === 'locked') {
        seat.status = 'available';
        seat.locked_by_session = null;
        seat.locked_until = null;
        count++;
      }
    });
  });

  return { success: true, released_count: count };
}

/**
 * In-memory implementation of confirm_booking_atomic
 */
export function confirmMockBookingAtomic({
  showtimeId,
  seatIds,
  sessionId,
  userName,
  usn,
  email,
  ticketHash,
}) {
  // Input validations
  if (!userName || userName.trim().length < 3) {
    return { success: false, error: 'Full Name must be at least 3 characters' };
  }
  const cleanUsn = (usn || '').trim().toUpperCase();
  if (cleanUsn.length < 5) {
    return { success: false, error: 'Valid RVU USN required (e.g. RVU23BSE042)' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@rvu\.edu\.in$/i;
  if (!emailRegex.test((email || '').trim())) {
    return { success: false, error: 'Strictly an RVU student email (@rvu.edu.in) is required' };
  }
  if (!seatIds || seatIds.length === 0) {
    return { success: false, error: 'No seats specified' };
  }

  const showtime = MOCK_SHOWTIMES.find((s) => s.id === showtimeId);
  if (!showtime) return { success: false, error: 'Showtime not found' };

  const seats = inMemorySeats[showtimeId] || [];
  const nowMs = Date.now();

  // Verify all seats held by this session and not expired
  for (const seatId of seatIds) {
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return { success: false, error: 'Seat not found' };
    const lockExpiry = seat.locked_until ? new Date(seat.locked_until).getTime() : 0;
    if (seat.status !== 'locked' || seat.locked_by_session !== sessionId || lockExpiry < nowMs) {
      return { success: false, error: 'Seat hold has expired. Please reselect your seats.' };
    }
  }

  // Calculate price
  let totalAmount = 0;
  const bookedSeatObjects = [];
  seatIds.forEach((id) => {
    const seat = seats.find((s) => s.id === id);
    if (seat) {
      const price = seat.seat_tier === 'vip' ? showtime.price_vip : showtime.price_regular;
      totalAmount += price;
      seat.status = 'booked';
      seat.locked_by_session = null;
      seat.locked_until = null;
      bookedSeatObjects.push(`${seat.row_label}${seat.col_number}`);
    }
  });

  const bookingId = `book-${Date.now()}`;
  const newBooking = {
    id: bookingId,
    showtime_id: showtimeId,
    user_name: userName.trim(),
    usn: cleanUsn,
    rvu_email: email.trim().toLowerCase(),
    total_amount: totalAmount,
    ticket_hash: ticketHash || `hash-${cleanUsn}-${Date.now()}`,
    status: 'confirmed',
    seats: bookedSeatObjects.join(', '),
    checked_in_at: null,
    created_at: new Date().toISOString(),
  };

  inMemoryBookings.push(newBooking);

  return {
    success: true,
    booking_id: bookingId,
    ticket_hash: newBooking.ticket_hash,
    total_amount: totalAmount,
    seat_count: seatIds.length,
    usn: cleanUsn,
    user_name: userName.trim(),
    rvu_email: email.trim().toLowerCase(),
    seats: newBooking.seats,
  };
}

/**
 * In-memory implementation of verify_ticket_atomic
 */
export function verifyMockTicketAtomic(ticketHash, usn) {
  const cleanHash = (ticketHash || '').trim();
  const cleanUsn = (usn || '').trim().toUpperCase();

  const booking = inMemoryBookings.find(
    (b) => (cleanHash && b.ticket_hash === cleanHash) || (cleanUsn && b.usn === cleanUsn)
  );

  if (!booking) {
    return { valid: false, error: 'Ticket not found in RVU database' };
  }

  const showtime = MOCK_SHOWTIMES.find((s) => s.id === booking.showtime_id);
  const movie = showtime ? MOCK_MOVIES.find((m) => m.id === showtime.movie_id) : null;

  if (booking.checked_in_at) {
    return {
      valid: false,
      already_checked_in: true,
      checked_in_at: booking.checked_in_at,
      error: 'TICKET ALREADY USED FOR ADMISSION',
      ticket: {
        booking_id: booking.id,
        user_name: booking.user_name,
        usn: booking.usn,
        email: booking.rvu_email,
        movie_title: movie ? movie.title : 'RVU Screening',
        auditorium: showtime ? showtime.auditorium_name : 'Audi 1',
        start_time: showtime ? showtime.start_time : '',
        seats: booking.seats,
      },
    };
  }

  booking.checked_in_at = new Date().toISOString();

  return {
    valid: true,
    already_checked_in: false,
    checked_in_at: booking.checked_in_at,
    message: 'ENTRY APPROVED: Welcome to RVU Cinema!',
    ticket: {
      booking_id: booking.id,
      user_name: booking.user_name,
      usn: booking.usn,
      email: booking.rvu_email,
      movie_title: movie ? movie.title : 'RVU Screening',
      auditorium: showtime ? showtime.auditorium_name : 'Audi 1',
      start_time: showtime ? showtime.start_time : '',
      seats: booking.seats,
      total_amount: booking.total_amount,
    },
  };
}
