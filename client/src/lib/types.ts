export type JobActivity = "sitting" | "standing" | "physical";
export type TrainingType = "strength" | "endurance" | "mixed";
export type ProteinGoal = "maintain" | "build" | "lose";

export interface UserProfile {
  weightKg: number;
  heightCm: number;
  age?: number;
  goal?: ProteinGoal;
  job: JobActivity;
  trainingSessionsPerWeek: number;
  trainingType: TrainingType;
  customTargetGrams?: number;
}

export const defaultProfile: UserProfile = {
  weightKg: 70,
  heightCm: 175,
  age: 30,
  goal: "maintain",
  job: "sitting",
  trainingSessionsPerWeek: 0,
  trainingType: "strength",
};

export interface LogEntry {
  id: string;
  date: string; // "2026-10-25"
  name: string;
  proteinGrams: number;
}

export interface Food {
  id: number;
  name: string;
  brand?: string | null;
  proteinPer100g: number;
  servingGrams?: number | null;
  source: string;
}
