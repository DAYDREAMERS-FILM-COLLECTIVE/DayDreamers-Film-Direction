/**
 * src/screening/api.ts
 * API Service for catalog, showings, seat statuses, and reservation submission.
 * Self-contained with built-in fallbacks.
 */

import { Movie, Showing, BookingPayload, BookingApiResponse } from './types';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const LOCAL_MOVIES: Movie[] = [
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
    gradient: ['#2b1055', '#7597de', '#0a0a18'],
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
    gradient: ['#4a2c10', '#c98a3d', '#120b05'],
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
    gradient: ['#042f2e', '#14b8a6', '#03121a'],
    glyph: 'O'
  }
];

export function getFallbackShowings(): Showing[] {
  const now = new Date();
  const s1 = new Date(now.getTime() + 86400000 * 3);
  const s2 = new Date(now.getTime() + 86400000 * 10);
  const s3 = new Date(now.getTime() + 86400000 * 17);

  const makeShowing = (id: string, d: Date): Showing => {
    const dayNum = d.getDate();
    const monthIdx = d.getMonth();
    return {
      id,
      date: d.toISOString(),
      dayNum,
      monthStr: MONTHS[monthIdx].toUpperCase(),
      fullDateStr: `${MONTHS[monthIdx]} ${dayNum}`,
      time: '21:00',
      hall: 'D Block 3rd Floor'
    };
  };

  return [
    makeShowing('fallback-1', s1),
    makeShowing('fallback-2', s2),
    makeShowing('fallback-3', s3)
  ];
}

export async function fetchMovies(apiBase = ''): Promise<Movie[]> {
  try {
    const res = await fetch(`${apiBase}/api/movies`);
    if (!res.ok) return LOCAL_MOVIES;
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return LOCAL_MOVIES;

    return list.map((m: any) => ({
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
      gradient: (m.genre || '').toLowerCase().includes('sci')
        ? ['#2b1055', '#7597de', '#0a0a18']
        : (m.genre || '').toLowerCase().includes('drama')
        ? ['#4a2c10', '#c98a3d', '#120b05']
        : ['#042f2e', '#14b8a6', '#03121a'],
      glyph: (m.title || 'D').charAt(0).toUpperCase()
    }));
  } catch {
    return LOCAL_MOVIES;
  }
}

export async function fetchShowings(movieId: string, apiBase = ''): Promise<Showing[]> {
  if (!movieId) return getFallbackShowings();
  try {
    const res = await fetch(`${apiBase}/api/showings?movie_id=${encodeURIComponent(movieId)}`);
    if (!res.ok) return getFallbackShowings();
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) return getFallbackShowings();

    return list.map((s: any) => {
      const d = new Date(s.show_date);
      const dayNum = d.getUTCDate ? d.getUTCDate() : d.getDate();
      const monthIdx = d.getMonth();
      const monthStr = MONTHS[monthIdx] ? MONTHS[monthIdx].toUpperCase() : 'JAN';
      const fullDateStr = `${MONTHS[monthIdx] || 'Jan'} ${dayNum}, ${d.getFullYear()}`;

      return {
        id: s.id,
        movieId: s.movie_id,
        date: s.show_date,
        dayNum,
        monthStr,
        fullDateStr,
        time: s.show_time || '21:00',
        hall: s.hall || 'D Block 3rd Floor'
      };
    });
  } catch {
    return getFallbackShowings();
  }
}

export async function fetchSeatStatus(showingId: string, apiBase = ''): Promise<string[]> {
  if (!showingId || showingId.startsWith('fallback')) {
    return [];
  }
  try {
    const res = await fetch(`${apiBase}/api/seats/status?showing_id=${encodeURIComponent(showingId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.occupiedSeats) ? data.occupiedSeats : [];
  } catch {
    return [];
  }
}

export async function submitBooking(payload: BookingPayload, apiBase = ''): Promise<BookingApiResponse> {
  const finalPayload = {
    ...payload,
    showingId: payload.showingId || payload.showing_id,
    showing_id: payload.showing_id || payload.showingId
  };

  try {
    const res = await fetch(`${apiBase}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload)
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: 'Server returned an invalid JSON response.' };
    }

    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: { error: `Network error: ${err?.message || 'Unable to connect to booking server'}` }
    };
  }
}
