export type Goal = "lose_weight" | "gain_muscle" | "maintain";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutLocation = "home" | "gym";
export type Equipment =
  | "bodyweight"
  | "dumbbells"
  | "pull_up_bar"
  | "resistance_bands"
  | "none";

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  role: "user" | "admin" | "trainer";
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  goal?: Goal;
  fitnessLevel?: FitnessLevel;
  workoutLocation?: WorkoutLocation;
  availableEquipment?: Equipment[];
  targetMacros?: Macros;
  medicalConditions?: string[];
  isPremium?: boolean;
  premiumUntil?: string | null;
  aiTickets?: number;
  followers?: string[];
  following?: string[];
  isVerified?: boolean;
  createdAt?: string;
}

export interface Exercise {
  _id: string;
  name: string;
  muscleGroup: string;
  level: FitnessLevel;
  equipmentRequired: string;
  videoUrl?: string;
  description?: string;
  effectiveness?: number;
}

export interface PlanExercise {
  _id?: string;
  exerciseId: Exercise | string;
  sets: number;
  reps: string;
  restTimeInSeconds: number;
  aiNotes?: string;
}

export interface WorkoutDay {
  _id?: string;
  dayOfWeek: string;
  title?: string;
  scheduledTime?: string;
  isRestDay: boolean;
  durationEstimated?: number;
  exercises: PlanExercise[];
}

export interface WorkoutPlan {
  _id: string;
  userId: string;
  weeklySchedule: WorkoutDay[];
}

export interface SetPerformed {
  setNumber: number;
  reps: number;
  weight: number;
}

export interface LoggedExercise {
  exerciseId: string;
  setsPerformed: SetPerformed[];
}

export interface WorkoutLog {
  _id: string;
  userId: string;
  date: string;
  planDay?: string;
  exercises: LoggedExercise[];
  isCompleted: boolean;
}

export interface Food {
  _id: string;
  name: string;
  imageUrl?: string;
  baseUnit?: string;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  caloriesPer100g: number;
  rating?: number;
  healthStatus?: "healthy" | "normal" | "restricted";
}

export interface MealItem {
  _id?: string;
  foodId: string | Food;
  foodName: string;
  quantityInGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  _id: string;
  mealType: string;
  scheduledTime?: string;
  items: MealItem[];
  mealTotal: Macros;
}

export interface MealPlan {
  _id: string;
  userId: string;
  dailyTotal: Macros;
  meals: Meal[];
}

export interface ConsumedMeal {
  mealType: string;
  loggedAt: string;
  isExactlyAsPlanned: boolean;
  aiNote?: string;
  items: MealItem[];
  mealTotal: Macros;
}

export interface DailyDietLog {
  _id: string;
  userId: string;
  date: string;
  actualDailyTotal: Macros;
  consumedMeals: ConsumedMeal[];
  isDayCompleted: boolean;
}

export interface WeightEntry {
  weight: number;
  date: string;
}

export interface GamificationStats {
  rankPoints: number;
  streak: number;
  totalWorkoutSessions: number;
  totalPerfectDietDays: number;
  failStats: {
    eatWrongDays: number;
    noWorkoutDays: number;
    totalFailsDays: number;
  };
  currentWeekTrackers: {
    eatWrong: number;
    noWorkout: number;
    bothFail: number;
  };
}

export interface PeriodStats {
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  dietThisWeek: number;
  dietThisMonth: number;
}

export interface TodayStatus {
  didWorkout: boolean;
  didEatRight: boolean;
}

export interface ApiError {
  message?: string;
  success?: boolean;
}

// ==========================================
// CỘNG ĐỒNG (POSTS / FEED)
// ==========================================
export type PostType = "text" | "workout_log" | "diet_log" | "master_workout" | "master_diet";

export interface PostAuthor {
  _id: string;
  name: string;
  avatar?: string;
  role: "user" | "admin" | "trainer";
  isVerified?: boolean;
  isLocked?: boolean;
}

export interface Post {
  _id: string;
  userId: PostAuthor;
  content: string;
  images: string[];
  video?: string;
  postType: PostType;
  workoutSnapshot?: { weeklySchedule?: WorkoutDay[] } | null;
  dietSnapshot?: { dailyTotal?: Macros; meals?: Meal[] } | null;
  likes: string[];
  commentsCount: number;
  savesCount: number;
  viewsCount: number;
  sharesCount: number;
  createdAt: string;
}

export interface PostComment {
  _id: string;
  postId: string;
  userId: { _id: string; name: string; avatar?: string };
  content: string;
  createdAt: string;
}

// ==========================================
// PT — LỊCH RẢNH / THUÊ PT
// ==========================================
export interface PTFreeSlot {
  _id: string;
  startTime: string;
  endTime: string;
}

export interface NearbyPT {
  ptId: { _id: string; name: string; avatar?: string; isVerified?: boolean; role: string };
  date: string;
  location?: string | null;
  coordinates?: { lat: number | null; lng: number | null };
  freeSlots: PTFreeSlot[];
  distance: number | null;
}

export interface PTAvailabilityRecord {
  _id: string;
  ptId: string;
  date: string;
  isAvailable: boolean;
  location?: string | null;
  coordinates?: { lat: number | null; lng: number | null };
  slots: {
    _id: string;
    startTime: string;
    endTime: string;
    isBooked: boolean;
    bookedBy?: string | null;
  }[];
}

export interface HireRequest {
  _id: string;
  userId: { _id: string; name: string; avatar?: string; age?: number; goal?: string } | string;
  ptId: { _id: string; name: string; avatar?: string; isVerified?: boolean; phone?: string } | string;
  availabilityId: string;
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  goal?: string;
  price: number;
  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
  rejectReason?: string | null;
  cancelledBy?: "user" | "pt" | null;
  rating?: number | null;
  review?: string | null;
  createdAt: string;
}
