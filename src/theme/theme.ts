// Centralized design tokens for a cohesive, polished look.

export const BOARD_SIZE = 8; // 8x8 grid

export const palette = {
  // Backgrounds
  bg: '#0E1230',
  bgDeep: '#080A1F',
  surface: '#1B2150',
  surfaceLight: '#262E63',
  cellEmpty: '#1A2050',
  cellEmptyBorder: '#2A3170',

  // Text
  text: '#FFFFFF',
  textDim: '#9AA3D4',

  // Accents
  accent: '#5B7CFF',
  gold: '#FFD25A',
  danger: '#FF5C7A',
  success: '#48E5A0',

  // Preview highlight
  previewValid: 'rgba(91, 124, 255, 0.45)',
  previewInvalid: 'rgba(255, 92, 122, 0.35)',
};

// Vibrant gradient pairs used to color blocks. Each shape picks one.
export const blockColors: { from: string; to: string; glow: string }[] = [
  { from: '#FF7AB8', to: '#FF477E', glow: '#FF477E' }, // pink
  { from: '#6FE0FF', to: '#2D9CFF', glow: '#2D9CFF' }, // blue
  { from: '#9BFF7A', to: '#37D67A', glow: '#37D67A' }, // green
  { from: '#FFD56F', to: '#FFA53B', glow: '#FFA53B' }, // orange
  { from: '#C79BFF', to: '#8A5BFF', glow: '#8A5BFF' }, // purple
  { from: '#FF9F6F', to: '#FF5C5C', glow: '#FF5C5C' }, // coral
  { from: '#6FFFE0', to: '#1FC8A9', glow: '#1FC8A9' }, // teal
];

export const radii = {
  cell: 7,
  card: 22,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
