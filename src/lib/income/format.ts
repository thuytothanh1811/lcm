const millionFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

export function formatMillion(value: number, unit: string): string {
  return `${millionFormatter.format(value)} ${unit}`;
}

export function formatPercent(value: number): string {
  return `${millionFormatter.format(value)}%`;
}
