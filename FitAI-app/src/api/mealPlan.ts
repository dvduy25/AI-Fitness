import { api } from "./client";
import type { MealPlan } from "@/types";

export const mealPlanApi = {
  getMyPlan: () =>
    api
      .get<{ hasPlan: boolean; masterMealPlan?: MealPlan; message?: string }>("/meal-plan/my-plan")
      .then((r) => r.data),

  initManual: (mealsPerDay: number) =>
    api
      .post<{ message: string; masterMealPlan: MealPlan }>("/meal-plan/init-manual", { mealsPerDay })
      .then((r) => r.data),

  deletePlan: () => api.delete<{ message: string }>("/meal-plan/my-plan").then((r) => r.data),

  addMeal: (mealType: string, scheduledTime?: string) =>
    api
      .post<{ message: string; masterMealPlan: MealPlan }>("/meal-plan/meal", { mealType, scheduledTime })
      .then((r) => r.data),

  deleteMeal: (mealId: string) =>
    api.delete<{ message: string; masterMealPlan: MealPlan }>(`/meal-plan/meal/${mealId}`).then((r) => r.data),

  addFoodToMeal: (mealId: string, foodId: string, quantityInGrams: number) =>
    api
      .post<{ message: string; masterMealPlan: MealPlan }>("/meal-plan/item", {
        mealId,
        foodId,
        quantityInGrams,
      })
      .then((r) => r.data),

  updateFoodQuantity: (mealId: string, itemId: string, newQuantity: number) =>
    api
      .patch<{ message: string; masterMealPlan: MealPlan }>("/meal-plan/item", {
        mealId,
        itemId,
        newQuantity,
      })
      .then((r) => r.data),

  removeFoodFromMeal: (mealId: string, itemId: string) =>
    api
      .delete<{ message: string; masterMealPlan: MealPlan }>(`/meal-plan/item/${mealId}/${itemId}`)
      .then((r) => r.data),
};
