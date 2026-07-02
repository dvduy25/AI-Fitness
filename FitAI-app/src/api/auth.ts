import { api } from "./client";
import type { Equipment, FitnessLevel, Goal, User, WorkoutLocation } from "@/types";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: Goal;
  fitnessLevel: FitnessLevel;
  workoutLocation: WorkoutLocation;
  availableEquipment: Equipment[];
  medicalConditions?: string[];
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>("/users/register", payload).then((r) => r.data),

  login: (email: string, password: string) =>
    api.post<AuthResponse>("/users/login", { email, password }).then((r) => r.data),

  me: () => api.get<User>("/users/me").then((r) => r.data),

  updateProfile: (payload: Partial<User>) =>
    api.put<{ message: string; user: User }>("/users/me", payload).then((r) => r.data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api
      .put<{ message: string }>("/users/change-password", { oldPassword, newPassword })
      .then((r) => r.data),
};
