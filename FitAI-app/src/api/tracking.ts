import { api } from "./client";
import type {
  ConsumedMeal,
  DailyDietLog,
  Food,
  GamificationStats,
  Macros,
  PeriodStats,
  TodayStatus,
  WeightEntry,
} from "@/types";

export const dietLogApi = {
  history: (period: "week" | "month" | "all" = "week") =>
    api
      .get<{ data: (Macros & { date: string; isDayCompleted: boolean })[] }>("/diet/history", {
        params: { period },
      })
      .then((r) => r.data.data),

  byDate: (date: string) =>
    api.get<{ data: Macros | null }>("/diet/date", { params: { date } }).then((r) => r.data.data),

  logMeal: (payload: {
    mealType: string;
    mode?: "add" | "replace";
    items: ConsumedMeal["items"];
    mealTotal: Macros;
  }) => api.post<{ message: string; data: DailyDietLog }>("/diet/log-meal", payload).then((r) => r.data),
};

export const foodApi = {
  list: (search?: string) => api.get<Food[]>("/foods", { params: search ? { search } : {} }).then((r) => r.data),
};

export const weightApi = {
  log: (weight: number, date?: string) =>
    api
      .post<{ message: string; currentWeight: number; newMacros: Macros }>("/weight", { weight, date })
      .then((r) => r.data),

  history: (period: "week" | "month" | "year" | "all" = "month") =>
    api.get<{ data: WeightEntry[] }>("/weight/history", { params: { period } }).then((r) => r.data.data),
};

export const gamificationApi = {
  stats: () =>
    api
      .get<{ success: boolean; stats: GamificationStats; periodStats: PeriodStats; todayStatus: TodayStatus }>(
        "/gamification/stats"
      )
      .then((r) => r.data),
};
