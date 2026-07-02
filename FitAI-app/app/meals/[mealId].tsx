import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, FlatList } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Badge } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingScreen, EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import { mealPlanApi } from "@/api/mealPlan";
import { foodApi } from "@/api/tracking";
import type { Food, Meal, MealPlan } from "@/types";
import { color, font, radius, type } from "@/theme/tokens";

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "Bữa sáng",
  lunch: "Bữa trưa",
  dinner: "Bữa tối",
  snack: "Bữa phụ",
};
const mealLabel = (t: string) => MEAL_TYPE_LABEL[t.toLowerCase()] || t;

export default function MealDetail() {
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await mealPlanApi.getMyPlan();
      const found = res.masterMealPlan?.meals.find((m) => m._id === mealId) || null;
      setMeal(found);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [mealId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openPicker = async () => {
    setPickerOpen(true);
    if (foods.length === 0) {
      try {
        const list = await foodApi.list();
        setFoods(list);
      } catch (e) {
        toast.show(apiErrorMessage(e), "error");
      }
    }
  };

  const filteredFoods = foods.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()));

  const addFood = async () => {
    if (!selectedFood || !mealId) return;
    const qty = Number(grams);
    if (!qty || qty <= 0) {
      toast.show("Nhập khối lượng hợp lệ (gram).", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await mealPlanApi.addFoodToMeal(mealId, selectedFood._id, qty);
      const found = res.masterMealPlan.meals.find((m) => m._id === mealId) || null;
      setMeal(found);
      setPickerOpen(false);
      setSelectedFood(null);
      setGrams("100");
      setSearch("");
      toast.show(`Đã thêm ${selectedFood.name}`, "success");
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!mealId) return;
    try {
      const res = await mealPlanApi.removeFoodFromMeal(mealId, itemId);
      const found = res.masterMealPlan.meals.find((m) => m._id === mealId) || null;
      setMeal(found);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    }
  };

  const deleteMeal = async () => {
    if (!mealId) return;
    try {
      await mealPlanApi.deleteMeal(mealId);
      toast.show("Đã xóa bữa ăn", "success");
      router.back();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    }
  };

  if (loading) return <LoadingScreen />;

  if (!meal) {
    return (
      <Screen>
        <HeaderBar title="Bữa ăn" />
        <EmptyState icon="alert-circle-outline" title="Không tìm thấy bữa ăn này" />
      </Screen>
    );
  }

  if (pickerOpen) {
    return (
      <Screen scroll={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => (selectedFood ? setSelectedFood(null) : setPickerOpen(false))} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={color.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{selectedFood ? selectedFood.name : "Chọn món ăn"}</Text>
        </View>

        {selectedFood ? (
          <View>
            <Card style={{ marginBottom: 16 }}>
              <Text style={styles.macroLine}>
                {selectedFood.caloriesPer100g} kcal / 100g · P{selectedFood.proteinPer100g} C
                {selectedFood.carbsPer100g} F{selectedFood.fatPer100g}
              </Text>
            </Card>
            <Input
              label="Khối lượng (gram)"
              value={grams}
              onChangeText={setGrams}
              keyboardType="number-pad"
              suffix="g"
            />
            <Button label="Thêm vào bữa ăn" onPress={addFood} loading={busy} />
          </View>
        ) : (
          <>
            <Input
              placeholder="Tìm món ăn..."
              value={search}
              onChangeText={setSearch}
              leftIcon="search-outline"
            />
            <FlatList
              data={filteredFoods}
              keyExtractor={(f) => f._id}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={<EmptyState icon="fast-food-outline" title="Không tìm thấy món ăn" />}
              renderItem={({ item }) => (
                <Card onPress={() => setSelectedFood(item)} style={styles.foodRow} soft>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <Text style={styles.foodMeta}>{item.caloriesPer100g} kcal / 100g</Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color={color.primary} />
                </Card>
              )}
            />
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingBottom: 60 }}>
      <HeaderBar title={mealLabel(meal.mealType)} onDelete={deleteMeal} />

      <Card style={{ marginBottom: 16 }} soft>
        <Text style={styles.totalCalories}>{Math.round(meal.mealTotal.calories)} kcal</Text>
        <Text style={styles.macroLine}>
          Đạm {Math.round(meal.mealTotal.protein)}g · Tinh bột {Math.round(meal.mealTotal.carbs)}g · Béo{" "}
          {Math.round(meal.mealTotal.fat)}g
        </Text>
      </Card>

      {meal.items.length === 0 ? (
        <EmptyState icon="fast-food-outline" title="Chưa có món ăn" description="Thêm món vào bữa ăn này." />
      ) : (
        meal.items.map((item) => (
          <Card key={item._id} style={styles.itemCard} soft>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.foodName}</Text>
              <Text style={styles.itemMeta}>
                {item.quantityInGrams}g · {Math.round(item.calories)} kcal
              </Text>
            </View>
            <Pressable onPress={() => item._id && removeItem(item._id)} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={color.inkFaint} />
            </Pressable>
          </Card>
        ))
      )}

      <Button label="+ Thêm món ăn" variant="outline" onPress={openPicker} style={{ marginTop: 8 }} />
    </Screen>
  );
}

function HeaderBar({ title, onDelete }: { title: string; onDelete?: () => void }) {
  return (
    <View style={styles.headerRow}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={color.ink} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={color.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 16 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: { ...type.h1, color: color.ink, flex: 1 },
  totalCalories: { ...type.h1, color: color.ink, fontFamily: "Manrope_800ExtraBold" },
  macroLine: { ...type.body, color: color.inkFaint, marginTop: 4 },
  itemCard: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  itemName: { ...type.h3, color: color.ink },
  itemMeta: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  foodRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  foodName: { ...type.h3, color: color.ink },
  foodMeta: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
});
