import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View, Pressable, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen, EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import { workoutApi, workoutLogApi } from "@/api/workout";
import type { PlanExercise, WorkoutDay, LoggedExercise, SetPerformed } from "@/types";
import { color, dayLabels, font, radius, type } from "@/theme/tokens";

type Mode = "log" | "edit";

export default function WorkoutDayDetail() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("log");
  const [dayData, setDayData] = useState<WorkoutDay | null>(null);
  const [loggedSets, setLoggedSets] = useState<Record<string, SetPerformed[]>>({});
  const [previousMap, setPreviousMap] = useState<Record<string, SetPerformed[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const plan = await workoutApi.getPlan();
      const found = plan.weeklySchedule.find((d) => d.dayOfWeek === day) || null;
      setDayData(found);
      if (found) {
        const initial: Record<string, SetPerformed[]> = {};
        const prevs: Record<string, SetPerformed[]> = {};
        await Promise.all(
          found.exercises.map(async (ex) => {
            const exId = typeof ex.exerciseId === "object" ? ex.exerciseId._id : ex.exerciseId;
            try {
              const prevRes = await workoutLogApi.getPrevious(exId);
              if (prevRes.hasHistory && prevRes.previousSets) {
                prevs[exId] = prevRes.previousSets;
              }
            } catch {
              // no history yet — fine
            }
            initial[exId] = Array.from({ length: ex.sets }, (_, i) => ({
              setNumber: i + 1,
              reps: prevs[exId]?.[i]?.reps ?? 0,
              weight: prevs[exId]?.[i]?.weight ?? 0,
            }));
          })
        );
        setLoggedSets(initial);
        setPreviousMap(prevs);
      }
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [day, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateSet = (exId: string, idx: number, field: "reps" | "weight", value: string) => {
    setLoggedSets((prev) => {
      const arr = [...(prev[exId] || [])];
      arr[idx] = { ...arr[idx], [field]: Number(value.replace(/[^0-9.]/g, "")) || 0 };
      return { ...prev, [exId]: arr };
    });
  };

  const toggleRestDay = async (value: boolean) => {
    if (!dayData) return;
    const prev = dayData;
    setDayData({ ...dayData, isRestDay: value });
    try {
      await workoutApi.updateDay({ dayOfWeek: dayData.dayOfWeek, isRestDay: value });
    } catch (e) {
      setDayData(prev);
      toast.show(apiErrorMessage(e), "error");
    }
  };

  const removeExercise = async (exerciseId: string) => {
    if (!dayData) return;
    try {
      const res = await workoutApi.removeExercise(dayData.dayOfWeek, exerciseId);
      const found = res.plan.weeklySchedule.find((d) => d.dayOfWeek === dayData.dayOfWeek) || null;
      setDayData(found);
      toast.show("Đã xóa bài tập", "success");
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    }
  };

  const saveSession = async () => {
    if (!dayData) return;
    const exercises: LoggedExercise[] = dayData.exercises.map((ex) => {
      const exId = typeof ex.exerciseId === "object" ? ex.exerciseId._id : ex.exerciseId;
      return { exerciseId: exId, setsPerformed: loggedSets[exId] || [] };
    });
    setSaving(true);
    try {
      await workoutLogApi.save({ planDay: dayData.dayOfWeek, exercises });
      toast.show("Đã lưu kết quả buổi tập! 💪", "success");
      router.back();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (!dayData) {
    return (
      <Screen>
        <HeaderBar title={dayLabels[day || ""] || "Buổi tập"} />
        <EmptyState icon="alert-circle-outline" title="Không tìm thấy dữ liệu ngày này" />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingBottom: 60 }}>
      <HeaderBar title={dayData.title || `Buổi tập ${dayLabels[dayData.dayOfWeek]}`} />

      <Card style={styles.restCard} soft>
        <View style={styles.restRow}>
          <View>
            <Text style={styles.restTitle}>Ngày nghỉ</Text>
            <Text style={styles.restDesc}>Bật nếu hôm nay không tập luyện</Text>
          </View>
          <Switch
            value={dayData.isRestDay}
            onValueChange={toggleRestDay}
            trackColor={{ false: color.border, true: color.primarySoft }}
            thumbColor={dayData.isRestDay ? color.primary : "#fff"}
          />
        </View>
      </Card>

      {!dayData.isRestDay && (
        <>
          <View style={styles.modeSwitch}>
            <ModeTab label="Ghi kết quả" active={mode === "log"} onPress={() => setMode("log")} />
            <ModeTab label="Chỉnh sửa" active={mode === "edit"} onPress={() => setMode("edit")} />
          </View>

          {dayData.exercises.length === 0 ? (
            <Card>
              <EmptyState
                icon="add-circle-outline"
                title="Chưa có bài tập"
                description="Thêm bài tập từ thư viện để bắt đầu."
                actionLabel="Thêm bài tập"
                onAction={() => router.push({ pathname: "/workout/add-exercise", params: { day: dayData.dayOfWeek } })}
              />
            </Card>
          ) : (
            <>
              {dayData.exercises.map((ex, i) => (
                <ExerciseBlock
                  key={ex._id || i}
                  exercise={ex}
                  mode={mode}
                  loggedSets={loggedSets}
                  previousMap={previousMap}
                  onUpdateSet={updateSet}
                  onRemove={removeExercise}
                />
              ))}
              {mode === "edit" ? (
                <Button
                  label="+ Thêm bài tập"
                  variant="outline"
                  onPress={() => router.push({ pathname: "/workout/add-exercise", params: { day: dayData.dayOfWeek } })}
                  style={{ marginTop: 4, marginBottom: 20 }}
                />
              ) : (
                <Button label="Lưu kết quả buổi tập" onPress={saveSession} loading={saving} style={{ marginTop: 8 }} />
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function HeaderBar({ title }: { title: string }) {
  return (
    <View style={styles.headerRow}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={color.ink} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeTab, active && styles.modeTabActive]}>
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ExerciseBlock({
  exercise,
  mode,
  loggedSets,
  previousMap,
  onUpdateSet,
  onRemove,
}: {
  exercise: PlanExercise;
  mode: Mode;
  loggedSets: Record<string, SetPerformed[]>;
  previousMap: Record<string, SetPerformed[]>;
  onUpdateSet: (exId: string, idx: number, field: "reps" | "weight", value: string) => void;
  onRemove: (exId: string) => void;
}) {
  const exObj = typeof exercise.exerciseId === "object" ? exercise.exerciseId : null;
  const exId = exObj ? exObj._id : (exercise.exerciseId as string);
  const sets = loggedSets[exId] || [];
  const prev = previousMap[exId];

  return (
    <Card style={styles.exCard}>
      <View style={styles.exHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.exTitle}>{exObj?.name || "Bài tập"}</Text>
          <Text style={styles.exSub}>
            {exercise.sets} hiệp × {exercise.reps} reps · nghỉ {exercise.restTimeInSeconds}s
          </Text>
        </View>
        {mode === "edit" ? (
          <Pressable onPress={() => onRemove(exId)} hitSlop={8}>
            <Ionicons name="trash-outline" size={19} color={color.danger} />
          </Pressable>
        ) : exObj?.muscleGroup ? (
          <Badge label={exObj.muscleGroup} tone="neutral" />
        ) : null}
      </View>

      {exercise.aiNotes ? <Text style={styles.aiNote}>💡 {exercise.aiNotes}</Text> : null}

      {mode === "log" && (
        <View style={styles.setsWrap}>
          <View style={styles.setsHeaderRow}>
            <Text style={[styles.setColLabel, { width: 44 }]}>Hiệp</Text>
            <Text style={[styles.setColLabel, { flex: 1 }]}>Reps</Text>
            <Text style={[styles.setColLabel, { flex: 1 }]}>Kg</Text>
            {prev ? <Text style={[styles.setColLabel, { flex: 1.2 }]}>Lần trước</Text> : null}
          </View>
          {sets.map((s, idx) => (
            <View key={idx} style={styles.setRow}>
              <Text style={[styles.setNum, { width: 44 }]}>#{s.setNumber}</Text>
              <TextInput
                style={[styles.setInput, { flex: 1 }]}
                keyboardType="number-pad"
                value={s.reps ? String(s.reps) : ""}
                placeholder="0"
                placeholderTextColor={color.inkFaint}
                onChangeText={(v) => onUpdateSet(exId, idx, "reps", v)}
              />
              <TextInput
                style={[styles.setInput, { flex: 1 }]}
                keyboardType="decimal-pad"
                value={s.weight ? String(s.weight) : ""}
                placeholder="0"
                placeholderTextColor={color.inkFaint}
                onChangeText={(v) => onUpdateSet(exId, idx, "weight", v)}
              />
              {prev ? (
                <Text style={[styles.prevText, { flex: 1.2 }]}>
                  {prev[idx] ? `${prev[idx].reps}×${prev[idx].weight}kg` : "—"}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 16 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: { ...type.h1, color: color.ink, flex: 1 },
  restCard: { marginBottom: 16 },
  restRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  restTitle: { ...type.h3, color: color.ink },
  restDesc: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: "center" },
  modeTabActive: { backgroundColor: color.surface },
  modeTabText: { fontFamily: font.bodyMed, fontSize: 13.5, color: color.inkFaint },
  modeTabTextActive: { color: color.ink, fontFamily: font.bodySemi },
  exCard: { marginBottom: 12 },
  exHead: { flexDirection: "row", alignItems: "flex-start" },
  exTitle: { ...type.h3, color: color.ink },
  exSub: { ...type.bodySmall, color: color.inkFaint, marginTop: 3 },
  aiNote: { ...type.bodySmall, color: color.secondaryDark, backgroundColor: color.secondarySoft, padding: 8, borderRadius: 10, marginTop: 10 },
  setsWrap: { marginTop: 14 },
  setsHeaderRow: { flexDirection: "row", marginBottom: 8 },
  setColLabel: { ...type.bodySmall, color: color.inkFaint, fontFamily: font.bodySemi },
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setNum: { ...type.body, color: color.inkSoft },
  setInput: {
    backgroundColor: color.surfaceSoft,
    borderRadius: 10,
    height: 38,
    marginRight: 8,
    textAlign: "center",
    fontFamily: font.bodyMed,
    color: color.ink,
  },
  prevText: { ...type.bodySmall, color: color.inkFaint },
});
