/**
 * src/screening/constants/seatmapConfig.ts
 * Seat grid configuration & cross-platform 3D amphitheater perspective transform calculation.
 */

import { SeatTier } from '../types';

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const SEATS_PER_ROW = 10;
export const TOTAL_SEATS = ROWS.length * SEATS_PER_ROW; // 70 seats

export function getTierName(rowIndex: number): SeatTier {
  if (rowIndex < 2) return 'Front';
  if (rowIndex < 5) return 'Prime';
  return 'Recliner';
}

/**
 * Cross-Platform Amphitheater Curvature Helper.
 * Replaces invalid translateZ with native-supported perspective, rotateY, parabolic translateY, and scale.
 */
export function getSeatTransform(seatIndex: number, is2D: boolean) {
  if (is2D) {
    return {
      transform: []
    };
  }

  // offset ranges from -4.5 (leftmost seat 1) to +4.5 (rightmost seat 10)
  const offset = seatIndex - (SEATS_PER_ROW - 1) / 2;
  const rotateYDeg = `${(offset * 2.1).toFixed(2)}deg`;
  
  // Parabolic depth displacement: subtle curve pushing outer seats slightly back
  const translateY = Math.pow(Math.abs(offset), 1.8) * 1.5;
  
  // Natural perspective attenuation: outer seats scale down subtly
  const scale = 1 - Math.abs(offset) * 0.015;

  return {
    transform: [
      { perspective: 800 },
      { rotateY: rotateYDeg },
      { translateY },
      { scale }
    ]
  };
}
