export interface MovieSceneConfig {
  ambientColor: string;
  keyLightColor: string;
  glassTransmission: number;
  roughness: number;
  ior: number;
  apertureBladeOpen: number; // 0.0 to 1.0
  particleVelocity: number;
  particleColor: string;
  splineProgressTarget: number; // [0, 1]
  lensFocalLength: string;
  bloomIntensity: number;
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
  };
}

export const MOVIE_CATALOG: MovieItem[] = [
  {
    id: "film-01",
    slug: "the-neon-protocol",
    title: "THE NEON PROTOCOL",
    tagline: "In the shadow of synthetic memory, truth is rendered.",
    director: "Kaelen Voss",
    year: "2026",
    aspectRatio: "2.39:1 Anamorphic",
    runtime: "114 MIN",
    logline: "An optical engineer uncovers encrypted audio waveforms pressed into the glass of high-frequency surveillance lenses.",
    showtimes: [
      { id: "st-01", venue: "FPS Screening Auditorium Alpha", timeLabel: "19:00 IST", isoDate: "2026-09-20T19:00:00+05:30" },
      { id: "st-02", venue: "FPS Screening Auditorium Alpha", timeLabel: "22:15 IST", isoDate: "2026-09-20T22:15:00+05:30" }
    ],
    sceneConfig: {
      ambientColor: "#040b14",
      keyLightColor: "#00f0ff",
      glassTransmission: 0.96,
      roughness: 0.08,
      ior: 1.54,
      apertureBladeOpen: 0.85,
      particleVelocity: 1.8,
      particleColor: "#00f0ff",
      splineProgressTarget: 0.2,
      lensFocalLength: "50mm T/1.3",
      bloomIntensity: 1.2
    },
    domConfig: {
      accentColor: "#00f0ff",
      secondaryColor: "rgba(0, 240, 255, 0.15)"
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
      ambientColor: "#140902",
      keyLightColor: "#ff7a00",
      glassTransmission: 0.88,
      roughness: 0.16,
      ior: 1.62,
      apertureBladeOpen: 0.35,
      particleVelocity: 1.1,
      particleColor: "#ff7a00",
      splineProgressTarget: 0.55,
      lensFocalLength: "85mm T/1.5",
      bloomIntensity: 1.5
    },
    domConfig: {
      accentColor: "#ff7a00",
      secondaryColor: "rgba(255, 122, 0, 0.15)"
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
    logline: "A projectionist in an abandoned art-house theater discovers that shifting the optical prism block projects events that have not yet occurred.",
    showtimes: [
      { id: "st-05", venue: "FPS Chamber Theater", timeLabel: "20:00 IST", isoDate: "2026-09-22T20:00:00+05:30" }
    ],
    sceneConfig: {
      ambientColor: "#0f0518",
      keyLightColor: "#d946ef",
      glassTransmission: 0.98,
      roughness: 0.04,
      ior: 1.72,
      apertureBladeOpen: 1.0,
      particleVelocity: 2.2,
      particleColor: "#d946ef",
      splineProgressTarget: 0.9,
      lensFocalLength: "35mm T/1.2",
      bloomIntensity: 1.8
    },
    domConfig: {
      accentColor: "#d946ef",
      secondaryColor: "rgba(217, 70, 239, 0.15)"
    }
  }
];
