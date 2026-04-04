/**
 * Parse a positive integer CLI flag; returns `fallback` when the value is not a finite integer in range.
 */
export function parsePositiveInt(
  raw: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(n, max);
}
