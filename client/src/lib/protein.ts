import type { UserProfile } from "./types";

const proteinRanges = {
  maintain: [
    [0.8, 1.2],
    [1.2, 1.5],
    [1.4, 1.6],
  ],
  build: [
    [1.2, 1.5],
    [1.4, 1.8],
    [1.6, 2.0],
  ],
  lose: [
    [1.4, 1.7],
    [1.6, 1.9],
    [1.8, 2.1],
  ],
} as const;

export function dailyProteinFactor(p: UserProfile): number | null {
  if ((p.age ?? 30) < 18) return null;

  const sessions = p.trainingSessionsPerWeek;
  const bandIndex = sessions <= 1 ? 0 : sessions <= 3 ? 1 : 2;
  const [minimum, maximum] = proteinRanges[p.goal ?? "maintain"][bandIndex];

  let factor: number;
  if (sessions === 0 || p.trainingType === "endurance") {
    factor = minimum;
  } else if (p.trainingType === "strength") {
    factor = maximum;
  } else {
    factor = (minimum + maximum) / 2;
  }

  if ((p.age ?? 30) >= 65) factor = Math.max(factor, 1.0);
  if (p.job === "standing") factor += 0.05;
  if (p.job === "physical") factor += 0.1;

  return factor;
}

export function dailyProteinTarget(p: UserProfile): number | null {
  if (p.customTargetGrams && p.customTargetGrams > 0) {
    return p.customTargetGrams;
  }

  const factor = dailyProteinFactor(p);
  return factor === null ? null : Math.round(p.weightKg * factor);
}
