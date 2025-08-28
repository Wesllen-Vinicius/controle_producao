// src/screens/Producao/utils.ts
const ONE_DAY_MS = 86400000;

export const todayStr = (): string => new Date().toISOString().slice(0, 10);
export const tomorrow = (): Date => new Date(Date.now() + ONE_DAY_MS);

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

export const getProgressColor = (
  progress: number,
  themeColors: { success: string; danger: string }
): string => {
  if (progress >= 0.8) return themeColors.success;
  if (progress >= 0.5) return "#FF8C00"; // Laranja para "warning"
  return themeColors.danger;
};
