// src/screens/Estoque/utils.ts
const ONE_DAY_MS = 86400000;

export const todayStr = (): string => new Date().toISOString().slice(0, 10);

export const toISODate = (d: Date): string => d.toISOString().slice(0, 10);

export const endOfDayString = (ymd: string): string => `${ymd} 23:59:59`;

export const parseISODate = (s?: string): Date => {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const labelForYMD = (ymd: string): string => {
  const d = parseISODate(ymd);
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const dateStart = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  ).getTime();
  const diff = Math.round((dateStart - todayStart) / ONE_DAY_MS);

  if (diff === 0) return "Hoje";
  if (diff === -1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

export const isUnitType = (u?: string | null, type: "UN" = "UN") =>
  String(u ?? "").toUpperCase() === type;

export const formatQuantity = (
  unit: string | null | undefined,
  n: number
): string => {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: isUnitType(unit) ? 0 : 3,
    maximumFractionDigits: isUnitType(unit) ? 0 : 3,
  });
};

export const timeAgo = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.max(1, Math.floor((now - d) / 1000));
  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
};
