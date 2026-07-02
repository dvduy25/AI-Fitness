import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable, FlatList } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Chip, Badge } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingScreen, EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import { workoutApi } from "@/api/workout";
import type { Exercise } from "@/types";
import { color, font, radius, type } from "@/theme/tokens";

const MUSCLE_GROUPS = ["Tất cả", "Ngực", "Lưng", "Vai", "Chân", "Tay", "Bụng", "Toàn thân"];

export default function AddExercise() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("Tất cả");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10-12");
  const [rest, setRest] = useState("60");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await workoutApi.listExercises();
      setExercises(list);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesMuscle = muscle === "Tất cả" || ex.muscleGroup === muscle;
    return matchesSearch && matchesMuscle;
  });

  const addExercise = async () => {
    if (!selected || !day) return;
    setSaving(true);
    try {
      await workoutApi.addExercise({
        dayOfWeek: day,
        exerciseId: selected._id,
        sets: Number(sets) || 3,
        reps,
        restTimeInSeconds: Number(rest) || 60,
      });
      toast.show(`Đã thêm ${selected.name} vào buổi tập`, "success");
      router.back();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  if (selected) {
    return (
      <Screen scroll={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setSelected(null)} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={color.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>{selected.name}</Text>
        </View>
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.exDesc}>{selected.description || "Chưa có mô tả cho bài tập này."}</Text>
          <View style={styles.badgeRow}>
            <Badge label={selected.muscleGroup} tone="primary" />
            <Badge label={selected.level} tone="neutral" />
          </View>
        </Card>

        <View style={styles.configRow}>
          <Input
            label="Số hiệp"
            value={sets}
            onChangeText={setSets}
            keyboardType="number-pad"
            containerStyle={{ flex: 1, marginRight: 10 }}
          />
          <Input label="Số reps" value={reps} onChangeText={setReps} containerStyle={{ flex: 1 }} />
        </View>
        <Input label="Nghỉ giữa hiệp (giây)" value={rest} onChangeText={setRest} keyboardType="number-pad" />

        <Button label="Thêm vào buổi tập" onPress={addExercise} loading={saving} style={{ marginTop: 8 }} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={color.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Thư viện bài tập</Text>
      </View>

      <Input
        placeholder="Tìm bài tập..."
        value={search}
        onChangeText={setSearch}
        leftIcon="search-outline"
        containerStyle={{ marginBottom: 4 }}
      />
      <FlatList
        horizontal
        data={MUSCLE_GROUPS}
        keyExtractor={(m) => m}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: 12 }}
        renderItem={({ item }) => <Chip label={item} selected={muscle === item} onPress={() => setMuscle(item)} />}
      />

      {loading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(ex) => ex._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState icon="search-outline" title="Không tìm thấy bài tập nào" />}
          renderItem={({ item }) => (
            <Card onPress={() => setSelected(item)} style={styles.exRow} soft>
              <View style={styles.exIconWrap}>
                <Ionicons name="barbell-outline" size={18} color={color.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{item.name}</Text>
                <Text style={styles.exMeta}>
                  {item.muscleGroup} · {item.equipmentRequired}
                </Text>
              </View>
              <Ionicons name="add-circle" size={24} color={color.primary} />
            </Card>
          )}
        />
      )}
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
  exRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingVertical: 12 },
  exIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.primarySofter,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exName: { ...type.h3, color: color.ink },
  exMeta: { ...type.bodySmall, color: color.inkFaint, marginTop: 2, textTransform: "capitalize" },
  exDesc: { ...type.body, color: color.inkSoft, lineHeight: 21 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  configRow: { flexDirection: "row" },
});
