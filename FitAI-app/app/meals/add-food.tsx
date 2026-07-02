import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, FlatList } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Chip } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingScreen } from "@/components/ui/Feedback";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import { dietLogApi, foodApi } from "@/api/tracking";
import type { Food, MealItem } from "@/types";
import { color, font, radius, type } from "@/theme/tokens";

const MEAL_TYPES = [
  { key: "breakfast", label: "Bữa sáng" },
  { key: "lunch", label: "Bữa trưa" },
  { key: "dinner", label: "Bữa tối" },
  { key: "snack", label: "Bữa phụ" },
];

function computeItem(food: Food, grams: number): MealItem {
  const ratio = grams / 100;
  return {
    foodId: food._id,
    foodName: food.name,
    quantityInGrams: grams,
    calories: Math.round(food.caloriesPer100g * ratio),
    protein: Math.round(food.proteinPer100g * ratio),
    carbs: Math.round(food.carbsPer100g * ratio),
    fat: Math.round(food.fatPer100g * ratio),
  };
}

export default function AddFoodLog() {
  const toast = useToast();
  const [mealType, setMealType] = useState("breakfast");
  const [foods, setFoods] = useState<Food[]>([]);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<MealItem[]>([]);
  const [pickerFood, setPickerFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState("100");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await foodApi.list();
        setFoods(list);
      } catch (e) {
        toast.show(apiErrorMessage(e), "error");
      } finally {
        setLoadingFoods(false);
      }
    })();
  }, [toast]);

  const filtered = foods.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()));

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (acc, i) => ({
          calories: acc.calories + i.calories,
          protein: acc.protein + i.protein,
          carbs: acc.carbs + i.carbs,
          fat: acc.fat + i.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [cart]
  );

  const addToCart = () => {
    if (!pickerFood) return;
    const g = Number(grams);
    if (!g || g <= 0) {
      toast.show("Nhập khối lượng hợp lệ.", "error");
      return;
    }
    setCart((prev) => [...prev, computeItem(pickerFood, g)]);
    setPickerFood(null);
    setGrams("100");
    setSearch("");
  };

  const submit = async () => {
    if (cart.length === 0) {
      toast.show("Thêm ít nhất một món ăn.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await dietLogApi.logMeal({ mealType, mode: "add", items: cart, mealTotal: cartTotal });
      toast.show("Đã ghi nhật ký bữa ăn 🎉", "success");
      router.back();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (pickerFood) {
    return (
      <Screen scroll={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setPickerFood(null)} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={color.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{pickerFood.name}</Text>
        </View>
        <Card style={{ marginBottom: 16 }} soft>
          <Text style={styles.macroLine}>
            {pickerFood.caloriesPer100g} kcal / 100g · P{pickerFood.proteinPer100g} C{pickerFood.carbsPer100g} F
            {pickerFood.fatPer100g}
          </Text>
        </Card>
        <Input label="Khối lượng (gram)" value={grams} onChangeText={setGrams} keyboardType="number-pad" suffix="g" />
        <Button label="Thêm vào danh sách" onPress={addToCart} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={color.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Ghi món ăn</Text>
      </View>

      <Text style={styles.sectionLabel}>Loại bữa ăn</Text>
      <View style={styles.mealTypeRow}>
        {MEAL_TYPES.map((m) => (
          <Chip key={m.key} label={m.label} selected={mealType === m.key} onPress={() => setMealType(m.key)} />
        ))}
      </View>

      {cart.length > 0 && (
        <Card style={{ marginBottom: 14 }} soft>
          <Text style={styles.cartTitle}>
            Đã chọn: {Math.round(cartTotal.calories)} kcal
          </Text>
          {cart.map((item, idx) => (
            <View key={idx} style={styles.cartRow}>
              <Text style={styles.cartItemText}>
                {item.foodName} · {item.quantityInGrams}g
              </Text>
              <Pressable onPress={() => setCart((prev) => prev.filter((_, i) => i !== idx))} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={color.inkFaint} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      <Input
        placeholder="Tìm món ăn để thêm..."
        value={search}
        onChangeText={setSearch}
        leftIcon="search-outline"
      />

      {loadingFoods ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => f._id}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListEmptyComponent={<EmptyState icon="fast-food-outline" title="Không tìm thấy món ăn" />}
          renderItem={({ item }) => (
            <Card onPress={() => setPickerFood(item)} style={styles.foodRow} soft>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodMeta}>{item.caloriesPer100g} kcal / 100g</Text>
              </View>
              <Ionicons name="add-circle" size={22} color={color.primary} />
            </Card>
          )}
        />
      )}

      <Button label={`Lưu nhật ký (${cart.length} món)`} onPress={submit} loading={submitting} disabled={cart.length === 0} />
    </Screen>
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
  sectionLabel: { ...type.label, color: color.inkSoft, textTransform: "uppercase", marginBottom: 10 },
  mealTypeRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  macroLine: { ...type.body, color: color.inkFaint },
  cartTitle: { ...type.h3, color: color.ink, marginBottom: 8 },
  cartRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  cartItemText: { ...type.bodySmall, color: color.inkSoft },
  foodRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  foodName: { ...type.h3, color: color.ink },
  foodMeta: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
});
