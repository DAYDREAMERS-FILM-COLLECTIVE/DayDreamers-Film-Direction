export interface MovieSceneConfig {
  ambientColor: string;
  keyLightColor: string;
  glassTransmission: number;
  roughness: number;
  ior: number;
  particleColor: string;
  modelRotation: [number, number, number];
  lensFocalLength: string;
}

export interface MovieShowtimeConfig {
  id: string;
  venue: string;
  timeLabel: string;
  isoDate: string;
}

export interface MovieItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  director: string;
  year: string;
  aspectRatio: string;
  runtime: string;
  logline: string;
  showtimes: MovieShowtimeConfig[];
  sceneConfig: MovieSceneConfig;
  domConfig: {
    accentColor: string;
    secondaryColor: string;
    badgeBg: string;
  };
}

export const MOVIE_CATALOG: MovieItem[] = [
  {
    id: "film-01",
    slug: "the-neon-protocol",
    title: "THE SILENT PROTOCOL",
    tagline: "In the shadow of synthetic memory, truth is rendered.",
    director: "Kaelen Voss",
    year: "2026",
    aspectRatio: "2.39:1 Anamorphic",
    runtime: "114 MIN",
    logline: "An optical engineer uncovers encrypted acoustic waveforms pressed into the glass of vintage cinema lenses.",
    showtimes: [
      { id: "st-01", venue: "FPS Screening Auditorium Alpha", timeLabel: "19:00 IST", isoDate: "2026-09-20T19:00:00+05:30" },
      { id: "st-02", venue: "FPS Screening Auditorium Alpha", timeLabel: "22:15 IST", isoDate: "2026-09-20T22:15:00+05:30" }
    ],
    sceneConfig: {
      ambientColor: "#060814",
      keyLightColor: "#C92A42", // Crimson
      glassTransmission: 0.94,
      roughness: 0.12,
      ior: 1.54,
      particleColor: "#E8E3D9",
      modelRotation: [0.15, 0.4, 0],
      lensFocalLength: "50mm T/1.3 Cooke",
    },
    domConfig: {
      accentColor: "#C92A42", // Crimson
      secondaryColor: "rgba(201, 42, 66, 0.2)",
      badgeBg: "#C92A42",
    }
  },
  {
    id: "film-02",
    slug: "monolith-silence",
    title: "MONOLITH SILENCE",
    tagline: "Sound cannot escape the deep mantle.",
    director: "Elena Ramos",
    year: "2026",
    aspectRatio: "1.43:1 IMAX 70mm",
    runtime: "142 MIN",
    logline: "Deep within the Atacama desert, seismic sensors detect a rhythmic subterranean frequency pulsing at precisely 24 frames per second.",
    showtimes: [
      { id: "st-03", venue: "FPS Main Auditorium 70mm", timeLabel: "18:30 IST", isoDate: "2026-09-21T18:30:00+05:30" },
      { id: "st-04", venue: "FPS Main Auditorium 70mm", timeLabel: "21:45 IST", isoDate: "2026-09-21T21:45:00+05:30" }
    ],
    sceneConfig: {
      ambientColor: "#120E15",
      keyLightColor: "#D4AF37", // Muted Gold
      glassTransmission: 0.88,
      roughness: 0.22,
      ior: 1.62,
      particleColor: "#D4AF37",
      modelRotation: [-0.2, -0.6, 0.1],
      lensFocalLength: "85mm T/1.5 Zeiss",
    },
    domConfig: {
      accentColor: "#D4AF37", // Muted Gold
      secondaryColor: "rgba(212, 175, 55, 0.2)",
      badgeBg: "#D4AF37",
    }
  },
  {
    id: "film-03",
    slug: "prism-drift",
    title: "PRISM DRIFT",
    tagline: "Every refraction is an alternate timeline.",
    director: "Siddharth Nair",
    year: "2026",
    aspectRatio: "1.85:1 Academy Flat",
    runtime: "98 MIN",
    logline: "A projectionist in an abandoned art-house theater discovers that rotating the anamorphic prism block projects events that have not yet occurred.",
    showtimes: [
      { id: "st-05", venue: "FPS Chamber Theater", timeLabel: "20:00 IST", isoDate: "2026-09-22T20:00:00+05:30" }
    ],
    sceneConfig: {
      ambientColor: "#080c1e",
      keyLightColor: "#E8E3D9", // Bone White
      glassTransmission: 0.98,
      roughness: 0.08,
      ior: 1.72,
      particleColor: "#C92A42",
      modelRotation: [0.3, 0.8, -0.15],
      lensFocalLength: "35mm T/1.2 Panavision",
    },
    domConfig: {
      accentColor: "#E8E3D9", // Bone White
      secondaryColor: "rgba(232, 227, 217, 0.2)",
      badgeBg: "#120E15",
    }
  }
];
