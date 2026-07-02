import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Badge, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingScreen } from "@/components/ui/Feedback";
import { CalorieRing } from "@/components/ui/CalorieRing";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import { mealPlanApi } from "@/api/mealPlan";
import { dietLogApi } from "@/api/tracking";
import type { DailyDietLog, Meal, MealPlan } from "@/types";
import { color, font, radius, type } from "@/theme/tokens";

type Mode = "plan" | "log";

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "Bữa sáng",
  lunch: "Bữa trưa",
  dinner: "Bữa tối",
  snack: "Bữa phụ",
};

const mealLabel = (t: string) => MEAL_TYPE_LABEL[t.toLowerCase()] || t;

export default function MealsTab() {
  const { user } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("log");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPlan, setHasPlan] = useState(true);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [today, setToday] = useState<DailyDietLog["actualDailyTotal"] | null>(null);
  const [loggedTypes, setLoggedTypes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [planRes, todayMacros] = await Promise.all([
        mealPlanApi.getMyPlan(),
        dietLogApi.byDate(new Date().toISOString().slice(0, 10)),
      ]);
      setHasPlan(planRes.hasPlan);
      setPlan(planRes.masterMealPlan || null);
      setToday(todayMacros);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const createPlan = async () => {
    setCreating(true);
    try {
      const res = await mealPlanApi.initManual(3);
      setPlan(res.masterMealPlan);
      setHasPlan(true);
      toast.show("Đã tạo thực đơn với 3 bữa/ngày", "success");
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setCreating(false);
    }
  };

  const logMealAsPlanned = async (meal: Meal) => {
    if (meal.items.length === 0) {
      toast.show("Bữa ăn này chưa có món nào trong kế hoạch.", "error");
      return;
    }
    try {
      await dietLogApi.logMeal({
        mealType: meal.mealType,
        mode: "replace",
        items: meal.items,
        mealTotal: meal.mealTotal,
      });
      toast.show(`Đã ghi nhận ${mealLabel(meal.mealType)} 🎉`, "success");
      load();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    }
  };

  const target = user?.targetMacros || plan?.dailyTotal || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  if (loading) return <LoadingScreen />;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      contentStyle={{ paddingBottom: 130 }}
    >
      <Text style={styles.header}>Dinh dưỡng</Text>
      <Text style={styles.sub}>Theo dõi bữa ăn hằng ngày</Text>

      <View style={styles.modeSwitch}>
        <ModeTab label="Hôm nay" active={mode === "log"} onPress={() => setMode("log")} />
        <ModeTab label="Kế hoạch thực đơn" active={mode === "plan"} onPress={() => setMode("plan")} />
      </View>

      {!hasPlan ? (
        <Card>
          <EmptyState
            icon="restaurant-outline"
            title="Chưa có thực đơn"
            description="Tạo thực đơn để bắt đầu theo dõi calo và macro mỗi ngày."
            actionLabel="Tạo thực đơn"
            onAction={createPlan}
          />
          {creating ? <Button label="Đang tạo..." loading disabled onPress={() => {}} style={{ marginTop: 8 }} /> : null}
        </Card>
      ) : mode === "log" ? (
        <>
          <Card style={styles.ringCard}>
            <CalorieRing current={today?.calories || 0} target={target.calories} size={150} strokeWidth={13} />
          </Card>
          <SectionHeader title="Các bữa trong kế hoạch" subtitle="Nhấn để ghi nhận nếu bạn ăn đúng như dự kiến" />
          {plan?.meals.map((meal) => (
            <Card key={meal._id} style={styles.mealCard}>
              <View style={styles.mealRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealTitle}>{mealLabel(meal.mealType)}</Text>
                  <Text style={styles.mealMeta}>
                    {Math.round(meal.mealTotal.calories)} kcal · {meal.items.length} món
                  </Text>
                </View>
                <Pressable style={styles.logBtn} onPress={() => logMealAsPlanned(meal)}>
                  <Ionicons name="checkmark" size={16} color={color.secondaryDark} />
                  <Text style={styles.logBtnText}>Đã ăn</Text>
                </Pressable>
              </View>
              {meal.items.slice(0, 3).map((item) => (
                <Text key={item._id || item.foodName} style={styles.itemText} numberOfLines={1}>
                  • {item.foodName} ({item.quantityInGrams}g)
                </Text>
              ))}
            </Card>
          ))}
          <Button
            label="Ghi món ăn khác"
            variant="outline"
            onPress={() => router.push("/meals/add-food")}
            style={{ marginTop: 4 }}
          />
        </>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Card soft style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{Math.round(plan?.dailyTotal.calories || 0)}</Text>
              <Text style={styles.summaryLabel}>kcal/ngày</Text>
            </Card>
            <Card soft style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{plan?.meals.length || 0}</Text>
              <Text style={styles.summaryLabel}>bữa/ngày</Text>
            </Card>
          </View>
          {plan?.meals.map((meal) => (
            <Card
              key={meal._id}
              style={styles.mealCard}
              onPress={() => router.push({ pathname: "/meals/[mealId]", params: { mealId: meal._id } })}
            >
              <View style={styles.mealRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealTitle}>{mealLabel(meal.mealType)}</Text>
                  <Text style={styles.mealMeta}>
                    {Math.round(meal.mealTotal.calories)} kcal · P{Math.round(meal.mealTotal.protein)} C
                    {Math.round(meal.mealTotal.carbs)} F{Math.round(meal.mealTotal.fat)}
                  </Text>
                </View>
                <Badge label={`${meal.items.length} món`} tone="neutral" />
                <Ionicons name="chevron-forward" size={18} color={color.inkFaint} style={{ marginLeft: 8 }} />
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeTab, active && styles.modeTabActive]}>
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { ...type.display, color: color.ink, marginTop: 8 },
  sub: { ...type.body, color: color.inkFaint, marginTop: 4, marginBottom: 16 },
  modeSwitch: { flexDirection: "row", backgroundColor: color.surfaceSoft, borderRadius: radius.md, padding: 4, marginBottom: 18 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: "center" },
  modeTabActive: { backgroundColor: color.surface },
  modeTabText: { fontFamily: font.bodyMed, fontSize: 13.5, color: color.inkFaint },
  modeTabTextActive: { color: color.ink, fontFamily: font.bodySemi },
  ringCard: { alignItems: "center", marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
  summaryValue: { ...type.h1, color: color.ink, fontFamily: "Manrope_800ExtraBold" },
  summaryLabel: { ...type.bodySmall, color: color.inkFaint, marginTop: 4 },
  mealCard: { marginBottom: 12 },
  mealRow: { flexDirection: "row", alignItems: "center" },
  mealTitle: { ...type.h3, color: color.ink },
  mealMeta: { ...type.bodySmall, color: color.inkFaint, marginTop: 3 },
  itemText: { ...type.bodySmall, color: color.inkSoft, marginTop: 8 },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.secondarySoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  logBtnText: { ...type.bodySmall, color: color.secondaryDark, fontFamily: font.bodySemi, marginLeft: 4 },
});
