import { api } from "./client";
import type { Exercise, WorkoutDay, WorkoutLog, WorkoutPlan } from "@/types";

export const workoutApi = {
  getPlan: () =>
    api.get<{ plan: WorkoutPlan }>("/workout-plan").then((r) => r.data.plan),

  getToday: (dayOfWeek?: string) =>
    api
      .get<{ hasPlan: boolean; dayOfWeek?: string; todayWorkout: WorkoutDay | null; message?: string }>(
        "/workout-plan/today",
        { params: dayOfWeek ? { dayOfWeek } : {} }
      )
      .then((r) => r.data),

  upsertPlan: (weeklySchedule: WorkoutDay[]) =>
    api.put<{ message: string; plan: WorkoutPlan }>("/workout-plan", { weeklySchedule }).then((r) => r.data),

  updateDay: (payload: Partial<WorkoutDay> & { dayOfWeek: string }) =>
    api.patch<{ message: string; plan: WorkoutPlan }>("/workout-plan/day", payload).then((r) => r.data),

  addExercise: (payload: {
    dayOfWeek: string;
    exerciseId: string;
    sets?: number;
    reps?: string;
    restTimeInSeconds?: number;
    aiNotes?: string;
  }) => api.post<{ message: string; plan: WorkoutPlan }>("/workout-plan/exercise", payload).then((r) => r.data),

  updateExercise: (payload: {
    dayOfWeek: string;
    exerciseId: string;
    sets?: number;
    reps?: string;
    restTimeInSeconds?: number;
    aiNotes?: string;
  }) => api.patch<{ message: string; plan: WorkoutPlan }>("/workout-plan/exercise", payload).then((r) => r.data),

  removeExercise: (dayOfWeek: string, exerciseId: string) =>
    api
      .delete<{ message: string; plan: WorkoutPlan }>("/workout-plan/exercise", {
        data: { dayOfWeek, exerciseId },
      })
      .then((r) => r.data),

  listExercises: (params?: { muscleGroup?: string; level?: string; search?: string }) =>
    api.get<Exercise[]>("/exercises", { params }).then((r) => r.data),
};

export const workoutLogApi = {
  getToday: () => api.get<{ log: WorkoutLog | null }>("/workout-logs/today").then((r) => r.data),

  save: (payload: { planDay: string; exercises: WorkoutLog["exercises"] }) =>
    api.post<{ message: string; log: WorkoutLog }>("/workout-logs", payload).then((r) => r.data),

  getPrevious: (exerciseId: string) =>
    api
      .get<{ hasHistory: boolean; date?: string; previousSets?: { setNumber: number; reps: number; weight: number }[] }>(
        `/workout-logs/previous/${exerciseId}`
      )
      .then((r) => r.data),

  getByDate: (date: string) =>
    api.get<{ log: WorkoutLog | null }>("/workout-logs/date", { params: { date } }).then((r) => r.data),
};
