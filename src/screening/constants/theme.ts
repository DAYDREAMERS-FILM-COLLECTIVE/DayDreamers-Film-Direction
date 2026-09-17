/**
 * src/screening/constants/theme.ts
 * Deep Plum design system tokens for the self-contained Screening module.
 */

export const THEME = {
  colors: {
    bg: '#1A0B17',
    bg2: '#261223',
    panel: '#3A1F33',
    plumDeep: '#1A0B17',
    plumDark: '#3A1F33',
    plumMid: '#6D3B56',
    plumAccent: '#C89BB2',
    plumLight: '#F2E9ED',
    gold: '#C89BB2',
    gold2: '#F2E9ED',
    goldDim: 'rgba(200, 155, 178, 0.35)',
    cream: '#F2E9ED',
    muted: '#A88698',
    border: '#6D3B56',
    borderSubtle: 'rgba(109, 59, 86, 0.45)',
    red: '#C84668',
    errorBg: 'rgba(255, 80, 110, 0.15)',
    errorBorder: 'rgba(255, 80, 110, 0.4)',
    errorText: '#FF8FA3',
    seatAvailable: '#3A1F33',
    seatSelected: '#C89BB2',
    seatOccupied: '#150913',
    seatOccupiedBorder: 'rgba(109, 59, 86, 0.25)'
  },
  typography: {
    titleFont: 'Playfair Display',
    bodyFont: 'Inter',
    brandFont: 'Bebas Neue',
    monoFont: 'DM Mono'
  }
} as const;
