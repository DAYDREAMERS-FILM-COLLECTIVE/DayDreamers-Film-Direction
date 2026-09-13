export interface SeatingTierConfig {
  id: string;
  name: string;
  description: string;
  rows: string[]; // e.g. ['A', 'B']
  seatsPerRow: number;
  curved: boolean;
  curveRadius: number; // Base radial distance from screen center
}

export interface VenueAuditoriumConfig {
  venueId: string;
  venueName: string;
  screenArcWidth: number;
  aisleGaps: number[]; // Gaps after seat numbers (e.g. 5 means gap between 5 and 6)
  tiers: SeatingTierConfig[];
}

export const AUDITORIUM_CONFIG: VenueAuditoriumConfig = {
  venueId: "cinetech-hall-alpha",
  venueName: "FPS Screening Auditorium Alpha",
  screenArcWidth: 680,
  aisleGaps: [5], // Split 10 seats into Left 5 and Right 5 with center aisle
  tiers: [
    {
      id: "tier-director",
      name: "Director's Box",
      description: "Front rows with wide-angle immersion & anamorphic sweet spot",
      rows: ["A", "B"],
      seatsPerRow: 10,
      curved: true,
      curveRadius: 400
    },
    {
      id: "tier-general",
      name: "Main Auditorium",
      description: "Acoustic center with optimal surround-field calibration",
      rows: ["C", "D", "E"],
      seatsPerRow: 10,
      curved: true,
      curveRadius: 520
    }
  ]
};
