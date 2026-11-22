export function goalProgressPercent(current: number, target: number | null): number | null {
  if (target === null || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current)) return null;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}
