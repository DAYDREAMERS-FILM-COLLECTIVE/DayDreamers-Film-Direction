/**
 * js/modules/screening/api.js
 * Screening & Booking API Client.
 * Handles movie catalog, showings schedule, live seat availability, and reservations.
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function format12Hour(timeStr) {
  if (!timeStr) return '7:30 PM';
  if (/am|pm/i.test(timeStr)) return timeStr.toUpperCase();
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function parseHall(hallStr) {
  if (!hallStr) return { hallLine: 'D Block 4th Floor', roomTag: 'Auditorium' };
  if (hallStr.includes(' - ')) {
    const parts = hallStr.split(' - ');
    return { hallLine: parts[0].trim(), roomTag: parts[1].trim() };
  }
  return { hallLine: hallStr.trim(), roomTag: 'Auditorium' };
}

export function parseShowingDate(dateInput) {
  let d;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = new Date(dateInput);
  }
  const dayNum = d.getUTCDate ? d.getUTCDate() : d.getDate();
  const monthIdx = d.getUTCMonth ? d.getUTCMonth() : d.getMonth();
  const weekdayIdx = d.getUTCDay ? d.getUTCDay() : d.getDay();
  const weekday = WEEKDAYS[weekdayIdx] || 'THU';
  const monthStr = MONTHS[monthIdx] ? MONTHS[monthIdx].toUpperCase() : 'SEP';
  const fullDateStr = `${MONTHS[monthIdx] || 'Sep'} ${dayNum}, ${d.getUTCFullYear ? d.getUTCFullYear() : d.getFullYear()}`;
  return { date: d, dayNum, monthStr, weekday, fullDateStr };
}

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
    quote: 'In the dark of the auditorium, neon is memory made visible.',
    quote_author: '— A. MOREAU',
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
    poster_url: '/assets/poster-the-last-reel.webp',
    quote: '“Cinema is the closest thing we have to time travel.”',
    quote_author: '— K. TANAKA',
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
    quote: 'Between the stars, silence is the only projector.',
    quote_author: '— E. VOLKOV',
    g: 'linear-gradient(150deg,#042f2e 0%,#14b8a6 55%,#03121a 100%)',
    glyph: 'O'
  }
];

export function fallbackShowings() {
  const now = new Date();
  const s1 = new Date(now.getTime() + 86400000 * 3);
  const s2 = new Date(now.getTime() + 86400000 * 10);
  const s3 = new Date(now.getTime() + 86400000 * 17);
  const p1 = parseShowingDate(s1);
  const p2 = parseShowingDate(s2);
  const p3 = parseShowingDate(s3);

  return [
    {
      id: 'fallback-1',
      date: p1.date,
      dayNum: p1.dayNum,
      monthStr: p1.monthStr,
      weekday: p1.weekday,
      fullDateStr: p1.fullDateStr,
      time: '19:30',
      time12h: '7:30 PM',
      hall: 'D Block 4th Floor',
      hallLine: 'D Block 4th Floor',
      roomTag: 'Auditorium'
    },
    {
      id: 'fallback-2',
      date: p2.date,
      dayNum: p2.dayNum,
      monthStr: p2.monthStr,
      weekday: p2.weekday,
      fullDateStr: p2.fullDateStr,
      time: '21:00',
      time12h: '9:00 PM',
      hall: 'D Block 4th Floor',
      hallLine: 'D Block 4th Floor',
      roomTag: 'Auditorium'
    },
    {
      id: 'fallback-3',
      date: p3.date,
      dayNum: p3.dayNum,
      monthStr: p3.monthStr,
      weekday: p3.weekday,
      fullDateStr: p3.fullDateStr,
      time: '21:00',
      time12h: '9:00 PM',
      hall: 'D Block 4th Floor',
      hallLine: 'D Block 4th Floor',
      roomTag: 'Auditorium'
    }
  ];
}

export async function fetchMovies() {
  try {
    const res = await fetch('/api/movies');
    if (!res.ok) return LOCAL_MOVIES;
    const list = await res.json();
    if (!list || !list.length) return LOCAL_MOVIES;

    return list.map(m => {
      const defaultQuote = m.director ? `— ${m.director}` : 'DayDreamers Film Society';
      return {
        id: m.id,
        title: (m.title || '').toUpperCase(),
        rawTitle: m.title || '',
        dir: 'Dir. ' + (m.director || 'Unknown'),
        rawDir: m.director || '',
        genre: (m.genre || 'CINEMA').toUpperCase(),
        runtime: m.runtime || '2H',
        year: m.year || 2024,
        rating: m.rating || 'A',
        hall: m.hall || 'D Block 4th Floor',
        blurb: m.blurb || '',
        poster_url: m.poster_url || '',
        quote: m.quote || (m.title === 'The Last Reel' ? '“Cinema is the closest thing we have to time travel.”' : ''),
        quote_author: m.quote_author || (m.title === 'The Last Reel' ? '— K. TANAKA' : (m.director ? `— ${m.director.toUpperCase()}` : '')),
        g: (m.genre || '').toLowerCase().includes('sci')
          ? 'linear-gradient(150deg,#2b1055 0%,#7597de 60%,#0a0a18 100%)'
          : (m.genre || '').toLowerCase().includes('drama')
          ? 'linear-gradient(150deg,#4a2c10 0%,#c98a3d 55%,#120b05 100%)'
          : 'linear-gradient(150deg,#042f2e 0%,#14b8a6 55%,#03121a 100%)',
        glyph: (m.title || 'D').charAt(0).toUpperCase()
      };
    });
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
      const parsed = parseShowingDate(s.show_date);
      const hallInfo = parseHall(s.hall);
      const timeStr = s.show_time || '19:30';

      return {
        id: s.id,
        date: parsed.date,
        dayNum: parsed.dayNum,
        monthStr: parsed.monthStr,
        weekday: parsed.weekday,
        fullDateStr: parsed.fullDateStr,
        time: timeStr,
        time12h: format12Hour(timeStr),
        hall: s.hall || 'D Block 4th Floor',
        hallLine: hallInfo.hallLine,
        roomTag: hallInfo.roomTag
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
