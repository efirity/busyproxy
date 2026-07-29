export function money(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function gb(bytes: number): string {
  const g = bytes / (1024 * 1024 * 1024);
  if (g < 0.01) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${g.toFixed(2)} GB`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
