export const ONE_DAY_MS = 86400000;

export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const getTodayStr = (): string => toISODate(new Date());

export const parseISODate = (s?: string): Date => {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const formatNumber = (n: number | null | undefined, dec = 2): string =>
  String(Number(n ?? 0).toFixed(dec));

export const labelForDate = (dateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const date = parseISODate(dateStr);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return "Hoje";
  if (date.getTime() === yesterday.getTime()) return "Ontem";

  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};
