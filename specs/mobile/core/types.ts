/**
 * src/core/types.ts
 * Type definitions for global layout, navigation, cursor, and transitions.
 */

export type PageRoute = 'home' | 'screening' | 'admin';

export type CursorMode = 'DEFAULT' | 'MENU' | 'GO' | 'PICK' | 'DATE' | 'OPEN' | 'SELECT' | 'CLOSE' | 'TOP' | 'RESERVE';

export interface CursorPosition {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}
