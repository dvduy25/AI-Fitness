import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Badge, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingScreen } from "@/components/ui/Feedback";
import { useToast } from "@/context/ToastContext";
import { workoutApi } from "@/api/workout";
import { apiErrorMessage } from "@/api/client";
import type { WorkoutDay } from "@/types";
import { color, dayLabels, dayOrder, todayKey, type } from "@/theme/tokens";

const DEFAULT_TEMPLATE: WorkoutDay[] = dayOrder.map((d) => ({
  dayOfWeek: d,
  title: "",
  isRestDay: true,
  exercises: [],
}));

export default function WorkoutTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [schedule, setSchedule] = useState<WorkoutDay[] | null>(null);
  const [hasPlan, setHasPlan] = useState(true);

  const load = useCallback(async () => {
    try {
      const plan = await workoutApi.getPlan();
      setSchedule(plan.weeklySchedule);
      setHasPlan(true);
    } catch {
      setHasPlan(false);
      setSchedule(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const createPlan = async () => {
    setCreating(true);
    try {
      const res = await workoutApi.upsertPlan(DEFAULT_TEMPLATE);
      setSchedule(res.plan.weeklySchedule);
      setHasPlan(true);
      toast.show("Đã tạo khung lịch tập. Hãy thêm bài tập vào từng ngày!", "success");
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const today = todayKey();
  const ordered = schedule ? [...schedule].sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)) : [];
  const activeDays = ordered.filter((d) => !d.isRestDay).length;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      contentStyle={{ paddingBottom: 130 }}
    >
      <Text style={styles.header}>Lịch tập</Text>
      <Text style={styles.sub}>Kế hoạch tuần này</Text>

      {!hasPlan ? (
        <Card style={{ marginTop: 20 }}>
          <EmptyState
            icon="barbell-outline"
            title="Chưa có lịch tập"
            description="Tạo khung lịch 7 ngày rồi thêm bài tập cho từng buổi từ thư viện."
            actionLabel="Tạo lịch tập mới"
            onAction={createPlan}
          />
          {creating ? <Button label="Đang tạo..." loading disabled onPress={() => {}} style={{ marginTop: 8 }} /> : null}
        </Card>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Card soft style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{activeDays}</Text>
              <Text style={styles.summaryLabel}>ngày tập / tuần</Text>
            </Card>
            <Card soft style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{7 - activeDays}</Text>
              <Text style={styles.summaryLabel}>ngày nghỉ</Text>
            </Card>
          </View>

          <SectionHeader title="7 ngày trong tuần" />
          {ordered.map((day) => (
            <Card
              key={day.dayOfWeek}
              style={StyleSheet.flatten([
                styles.dayCard,
                day.dayOfWeek === today && styles.dayCardToday,
              ])}
              onPress={() => router.push({ pathname: "/workout/[day]", params: { day: day.dayOfWeek } })}
            >
              <View style={styles.dayCardRow}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{dayLabels[day.dayOfWeek]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTitle}>
                    {day.isRestDay ? "Ngày nghỉ" : day.title || "Buổi tập"}
                  </Text>
                  {!day.isRestDay ? (
                    <Text style={styles.dayMeta}>
                      {day.exercises.length} bài tập
                      {day.scheduledTime ? ` · ${day.scheduledTime}` : ""}
                    </Text>
                  ) : (
                    <Text style={styles.dayMeta}>Nghỉ ngơi & hồi phục</Text>
                  )}
                </View>
                {day.dayOfWeek === today ? <Badge label="Hôm nay" tone="primary" /> : null}
                <Ionicons name="chevron-forward" size={18} color={color.inkFaint} style={{ marginLeft: 6 }} />
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { ...type.display, color: color.ink, marginTop: 8 },
  sub: { ...type.body, color: color.inkFaint, marginTop: 4, marginBottom: 6 },
  summaryRow: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 8 },
  summaryCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
  summaryValue: { ...type.h1, color: color.ink, fontFamily: "Manrope_800ExtraBold" },
  summaryLabel: { ...type.bodySmall, color: color.inkFaint, marginTop: 4 },
  dayCard: { marginBottom: 10, paddingVertical: 14 },
  dayCardToday: { borderWidth: 1.5, borderColor: color.primary },
  dayCardRow: { flexDirection: "row", alignItems: "center" },
  dayBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: color.primarySofter,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  dayBadgeText: { fontFamily: "Manrope_700Bold", fontSize: 12.5, color: color.primaryDark },
  dayTitle: { ...type.h3, color: color.ink },
  dayMeta: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
});
