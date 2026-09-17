/**
 * js/modules/screening/api.js
 * Screening & Booking API Client.
 * Handles movie catalog, showings schedule, live seat availability, and reservations.
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const LOCAL_MOVIES = [
  {
    id: '3d0536d8-c83d-4677-99c1-aa42c77805a2',
    title: 'NEON REVERIE',
    rawTitle: 'Neon Reverie',
    dir: 'Dir. A. Moreau',
    rawDir: 'A. Moreau',
    genre: 'SCI-FI',
    runtime: '2H 14M',
    year: 2024,
    rating: 'A',
    hall: 'D Block 3rd Floor',
    blurb: 'A signal lost between stations. A driver follows it past the edge of the mapped city.',
    poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
    g: 'linear-gradient(150deg,#2b1055 0%,#7597de 60%,#0a0a18 100%)',
    glyph: 'N'
  },
  {
    id: 'e348a230-4674-4ab2-87ad-b0058ec80028',
    title: 'THE LAST REEL',
    rawTitle: 'The Last Reel',
    dir: 'Dir. K. Tanaka',
    rawDir: 'K. Tanaka',
    genre: 'DRAMA',
    runtime: '1H 52M',
    year: 2023,
    rating: 'UA',
    hall: 'D Block 4th Floor',
    blurb: 'An aging projectionist discovers a single frame of unreleased nitrate film tucked into an archival spool.',
    poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    g: 'linear-gradient(150deg,#4a2c10 0%,#c98a3d 55%,#120b05 100%)',
    glyph: 'R'
  },
  {
    id: '01df6de4-f766-48b8-847f-32dd4da7b159',
    title: 'SILENT ORBIT',
    rawTitle: 'Silent Orbit',
    dir: 'Dir. E. Volkov',
    rawDir: 'E. Volkov',
    genre: 'THRILLER',
    runtime: '2H 05M',
    year: 2024,
    rating: 'A',
    hall: 'D Block 3rd Floor',
    blurb: 'Thirty days into a lunar relay rotation, communications cease. The backup antenna begins receiving coordinates from inside the crater.',
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    g: 'linear-gradient(150deg,#042f2e 0%,#14b8a6 55%,#03121a 100%)',
    glyph: 'O'
  }
];

export function fallbackShowings() {
  const now = new Date();
  const s1 = new Date(now.getTime() + 86400000 * 3);
  const s2 = new Date(now.getTime() + 86400000 * 10);
  const s3 = new Date(now.getTime() + 86400000 * 17);
  return [
    {
      id: 'fallback-1',
      date: s1,
      dayNum: s1.getDate(),
      monthStr: MONTHS[s1.getMonth()].toUpperCase(),
      fullDateStr: MONTHS[s1.getMonth()] + ' ' + s1.getDate(),
      time: '21:00',
      hall: 'D Block 3rd Floor'
    },
    {
      id: 'fallback-2',
      date: s2,
      dayNum: s2.getDate(),
      monthStr: MONTHS[s2.getMonth()].toUpperCase(),
      fullDateStr: MONTHS[s2.getMonth()] + ' ' + s2.getDate(),
      time: '21:00',
      hall: 'D Block 3rd Floor'
    },
    {
      id: 'fallback-3',
      date: s3,
      dayNum: s3.getDate(),
      monthStr: MONTHS[s3.getMonth()].toUpperCase(),
      fullDateStr: MONTHS[s3.getMonth()] + ' ' + s3.getDate(),
      time: '21:00',
      hall: 'D Block 3rd Floor'
    }
  ];
}

export async function fetchMovies() {
  try {
    const res = await fetch('/api/movies');
    if (!res.ok) return LOCAL_MOVIES;
    const list = await res.json();
    if (!list || !list.length) return LOCAL_MOVIES;

    return list.map(m => ({
      id: m.id,
      title: (m.title || '').toUpperCase(),
      rawTitle: m.title || '',
      dir: 'Dir. ' + (m.director || 'Unknown'),
      rawDir: m.director || '',
      genre: (m.genre || 'CINEMA').toUpperCase(),
      runtime: m.runtime || '2H',
      year: m.year || 2024,
      rating: m.rating || 'A',
      hall: m.hall || 'D Block 3rd Floor',
      blurb: m.blurb || '',
      poster_url: m.poster_url || '',
      g: (m.genre || '').toLowerCase().includes('sci')
        ? 'linear-gradient(150deg,#2b1055 0%,#7597de 60%,#0a0a18 100%)'
        : (m.genre || '').toLowerCase().includes('drama')
        ? 'linear-gradient(150deg,#4a2c10 0%,#c98a3d 55%,#120b05 100%)'
        : 'linear-gradient(150deg,#042f2e 0%,#14b8a6 55%,#03121a 100%)',
      glyph: (m.title || 'D').charAt(0).toUpperCase()
    }));
  } catch (err) {
    console.warn('Error loading films from API, falling back to local list:', err);
    return LOCAL_MOVIES;
  }
}

export async function fetchShowings(movieId) {
  if (!movieId) return fallbackShowings();
  try {
    const res = await fetch('/api/showings?movie_id=' + encodeURIComponent(movieId));
    if (!res.ok) return fallbackShowings();
    const list = await res.json();
    if (!list || !list.length) return fallbackShowings();

    return list.map(s => {
      const d = new Date(s.show_date);
      const dayNum = d.getUTCDate ? d.getUTCDate() : d.getDate();
      const monthIdx = d.getMonth();
      const monthStr = MONTHS[monthIdx] ? MONTHS[monthIdx].toUpperCase() : 'JAN';
      const fullDateStr = (MONTHS[monthIdx] || 'Jan') + ' ' + dayNum + ', ' + d.getFullYear();

      return {
        id: s.id,
        date: d,
        dayNum: dayNum,
        monthStr: monthStr,
        fullDateStr: fullDateStr,
        time: s.show_time || '21:00',
        hall: s.hall || 'D Block 3rd Floor'
      };
    });
  } catch (err) {
    console.warn('Error loading showings from API, using fallback schedule:', err);
    return fallbackShowings();
  }
}

export async function fetchSeatStatus(showingId) {
  if (!showingId || showingId.startsWith('fallback')) {
    return new Set();
  }
  try {
    const res = await fetch('/api/seats/status?showing_id=' + encodeURIComponent(showingId));
    if (!res.ok) return new Set();
    const data = await res.json();
    if (data && Array.isArray(data.occupiedSeats)) {
      return new Set(data.occupiedSeats);
    }
    return new Set();
  } catch (err) {
    console.warn('Error loading seat status:', err);
    return new Set();
  }
}

export async function submitBooking(payload) {
  // Ensure dual payload compliance: both showingId and showing_id
  const finalPayload = {
    ...payload,
    showingId: payload.showingId || payload.showing_id,
    showing_id: payload.showing_id || payload.showingId
  };

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload)
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { error: 'Server returned unparseable response: ' + text.slice(0, 100) };
    }

    return {
      ok: res.ok,
      status: res.status,
      data: data
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: 'Network request error: ' + err.message }
    };
  }
}
