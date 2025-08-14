// utils/color.ts
// Helpers simples de cor para o app

export function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const bigint =
    h.length === 3
      ? parseInt(h.split('').map((c) => c + c).join(''), 16)
      : parseInt(h, 16);

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

export function alpha(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  const clamped = Math.max(0, Math.min(1, a));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function mix(hexA: string, hexB: string, t = 0.5) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return rgbToHex(m(a.r, b.r), m(a.g, b.g), m(a.b, b.b));
}

export function lighten(hex: string, t = 0.1) {
  return mix(hex, '#ffffff', t);
}

export function darken(hex: string, t = 0.1) {
  return mix(hex, '#000000', t);
}

function rgbToHex(r: number, g: number, b: number) {
  const x = (n: number) => n.toString(16).padStart(2, '0');
  return `#${x(r)}${x(g)}${x(b)}`;
}
