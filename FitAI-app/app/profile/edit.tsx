import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import { authApi } from "@/api/auth";
import type { Equipment, FitnessLevel, Goal, WorkoutLocation } from "@/types";
import { color, type } from "@/theme/tokens";

const GOALS: { key: Goal; label: string }[] = [
  { key: "lose_weight", label: "Giảm cân" },
  { key: "gain_muscle", label: "Tăng cơ" },
  { key: "maintain", label: "Duy trì" },
];
const LEVELS: { key: FitnessLevel; label: string }[] = [
  { key: "beginner", label: "Mới bắt đầu" },
  { key: "intermediate", label: "Trung bình" },
  { key: "advanced", label: "Nâng cao" },
];
const LOCATIONS: { key: WorkoutLocation; label: string }[] = [
  { key: "home", label: "Tại nhà" },
  { key: "gym", label: "Phòng gym" },
];
const EQUIPMENT_OPTIONS: { key: Equipment; label: string }[] = [
  { key: "bodyweight", label: "Trọng lượng cơ thể" },
  { key: "dumbbells", label: "Tạ đơn" },
  { key: "pull_up_bar", label: "Xà đơn" },
  { key: "resistance_bands", label: "Dây kháng lực" },
  { key: "none", label: "Không có gì" },
];

export default function EditProfile() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age ? String(user.age) : "");
  const [height, setHeight] = useState(user?.height ? String(user.height) : "");
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : "");
  const [goal, setGoal] = useState<Goal>(user?.goal || "lose_weight");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(user?.fitnessLevel || "beginner");
  const [workoutLocation, setWorkoutLocation] = useState<WorkoutLocation>(user?.workoutLocation || "home");
  const [equipment, setEquipment] = useState<Equipment[]>(user?.availableEquipment || ["bodyweight"]);
  const [saving, setSaving] = useState(false);

  const toggleEquipment = (key: Equipment) => {
    setEquipment((prev) => (prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]));
  };

  const save = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile({
        name: name.trim(),
        age: Number(age) || undefined,
        height: Number(height) || undefined,
        weight: Number(weight) || undefined,
        goal,
        fitnessLevel,
        workoutLocation,
        availableEquipment: equipment,
      });
      await refreshProfile();
      toast.show("Đã lưu hồ sơ", "success");
      router.back();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={{ paddingBottom: 60 }}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={color.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
      </View>

      <Input label="Họ và tên" value={name} onChangeText={setName} leftIcon="person-outline" />
      <View style={styles.row3}>
        <Input label="Tuổi" value={age} onChangeText={setAge} keyboardType="number-pad" containerStyle={styles.col} />
        <Input label="Cao (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" containerStyle={styles.col} />
        <Input label="Nặng (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" containerStyle={styles.col} />
      </View>

      <Text style={styles.sectionLabel}>Mục tiêu</Text>
      <View style={styles.wrapRow}>
        {GOALS.map((g) => (
          <Chip key={g.key} label={g.label} selected={goal === g.key} onPress={() => setGoal(g.key)} />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Trình độ</Text>
      <View style={styles.wrapRow}>
        {LEVELS.map((l) => (
          <Chip key={l.key} label={l.label} selected={fitnessLevel === l.key} onPress={() => setFitnessLevel(l.key)} />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Nơi tập</Text>
      <View style={styles.wrapRow}>
        {LOCATIONS.map((l) => (
          <Chip key={l.key} label={l.label} selected={workoutLocation === l.key} onPress={() => setWorkoutLocation(l.key)} />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Dụng cụ sẵn có</Text>
      <View style={styles.wrapRow}>
        {EQUIPMENT_OPTIONS.map((eq) => (
          <Chip key={eq.key} label={eq.label} selected={equipment.includes(eq.key)} onPress={() => toggleEquipment(eq.key)} />
        ))}
      </View>

      <Button label="Lưu thay đổi" onPress={save} loading={saving} style={{ marginTop: 12 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 20 },
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
  row3: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  sectionLabel: { ...type.label, color: color.inkSoft, textTransform: "uppercase", marginTop: 6, marginBottom: 10 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap" },
});
