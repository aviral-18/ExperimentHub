/** Formatting helpers mirroring the backend metric catalog units. */

export const METRIC_UNITS: Record<string, string> = {};

export function formatMetric(unit: string, value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  switch (unit) {
    case "%":
      return `${(value * 100).toFixed(2)}%`;
    case "₹":
      return `₹${formatNumber(value, 2)}`;
    case "min":
      return `${value.toFixed(1)} min`;
    case "★":
      return `${value.toFixed(2)}★`;
    case "count":
      return value.toFixed(2);
    default:
      return formatNumber(value, 2);
  }
}

export function formatNumber(value: number, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompact(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${(value / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${(value / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return formatNumber(value, 0);
}

export function formatCurrencyCompact(value: number): string {
  return `₹${formatCompact(value)}`;
}

export function formatPercent(value: number, decimals = 1, signed = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const s = value.toFixed(decimals);
  return signed && value > 0 ? `+${s}%` : `${s}%`;
}

export function formatPValue(p: number): string {
  if (p < 0.0001) return "< 0.0001";
  return p.toFixed(4);
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}
