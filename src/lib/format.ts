/** Decimal feet → feet-inches string, rounded to the nearest ½". 12.125 → 12'1.5" */
export function formatFeet(value: number): string {
  const neg = value < 0;
  const halfInches = Math.round(Math.abs(value) * 24);
  const feet = Math.floor(halfInches / 24);
  const inches = (halfInches - feet * 24) / 2;
  const inchStr = Number.isInteger(inches) ? String(inches) : inches.toFixed(1);
  return `${neg ? '−' : ''}${feet}'${inchStr}"`;
}

export const formatDims = (w: number, h: number) => `${formatFeet(w)} × ${formatFeet(h)}`;

export const formatArea = (a: number) =>
  `${a.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sq ft`;
