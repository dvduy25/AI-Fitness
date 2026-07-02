import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, SectionHeader, Badge } from "@/components/ui/Card";
import { CalorieRing } from "@/components/ui/CalorieRing";
import { MacroBar } from "@/components/ui/MacroBar";
import { FlameStreak } from "@/components/ui/FlameStreak";
import { Avatar } from "@/components/ui/Feedback";
import { useAuth } from "@/context/AuthContext";
import { dietLogApi, gamificationApi } from "@/api/tracking";
import { workoutApi } from "@/api/workout";
import type { GamificationStats, PeriodStats, TodayStatus } from "@/types";
import type { WorkoutDay } from "@/types";
import { color, dayOrder, gradient, type } from "@/theme/tokens";

const jsDayToKey = (d: Date) => dayOrder[(d.getDay() + 6) % 7];

export default function Home() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [macros, setMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [completedDietDays, setCompletedDietDays] = useState<string[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<WorkoutDay | null>(null);
  const [hasWorkoutPlan, setHasWorkoutPlan] = useState(true);

  const load = useCallback(async () => {
    try {
      const [todayMacros, weekHistory, gami, todayW] = await Promise.all([
        dietLogApi.byDate(new Date().toISOString().slice(0, 10)),
        dietLogApi.history("week"),
        gamificationApi.stats(),
        workoutApi.getToday(),
      ]);
      setMacros(todayMacros || { calories: 0, protein: 0, carbs: 0, fat: 0 });
      setCompletedDietDays(
        weekHistory.filter((d) => d.isDayCompleted).map((d) => jsDayToKey(new Date(d.date)))
      );
      setStats(gami.stats);
      setPeriodStats(gami.periodStats);
      setTodayStatus(gami.todayStatus);
      setHasWorkoutPlan(todayW.hasPlan);
      setTodayWorkout(todayW.todayWorkout);
    } catch {
      // Non-blocking — dashboard degrades gracefully with defaults.
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

  const targetMacros = user?.targetMacros || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <Screen
      padded={false}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      contentStyle={{ paddingBottom: 120 }}
    >
      <LinearGradient colors={gradient.flame} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.greeting}>Chào buổi sáng,</Text>
            <Text style={styles.name}>{user?.name?.split(" ").slice(-1)[0] || "bạn"} 👋</Text>
          </View>
          <Avatar uri={user?.avatar} name={user?.name} size={46} />
        </View>
        <FlameStreak completedDays={completedDietDays} streak={stats?.streak ?? 0} />
      </LinearGradient>

      <View style={styles.body}>
        <Card style={styles.ringCard}>
          <View style={styles.ringRow}>
            <CalorieRing current={macros.calories} target={targetMacros.calories} />
            <View style={styles.macroCol}>
              <MacroBar label="Đạm" current={macros.protein} target={targetMacros.protein} tint={color.protein} />
              <MacroBar label="Tinh bột" current={macros.carbs} target={targetMacros.carbs} tint={color.carbs} />
              <MacroBar label="Chất béo" current={macros.fat} target={targetMacros.fat} tint={color.fat} />
            </View>
          </View>
        </Card>

        <View style={styles.statusRow}>
          <StatusPill
            done={!!todayStatus?.didWorkout}
            label="Đã tập hôm nay"
            icon="barbell-outline"
          />
          <StatusPill
            done={!!todayStatus?.didEatRight}
            label="Ăn đúng chuẩn"
            icon="nutrition-outline"
          />
        </View>

        <SectionHeader title="Buổi tập hôm nay" action="Xem lịch tuần" onAction={() => router.push("/(tabs)/workout")} />
        <Card>
          {!hasWorkoutPlan ? (
            <EmptyRow
              icon="add-circle-outline"
              text="Bạn chưa có lịch tập. Vào tab Lịch tập để tạo mới."
              onPress={() => router.push("/(tabs)/workout")}
            />
          ) : todayWorkout?.isRestDay ? (
            <EmptyRow icon="moon-outline" text="Hôm nay là ngày nghỉ. Hãy để cơ bắp hồi phục nhé!" />
          ) : todayWorkout ? (
            <View>
              <View style={styles.workoutHeadRow}>
                <Text style={styles.workoutTitle}>{todayWorkout.title || "Buổi tập hôm nay"}</Text>
                <Badge label={`${todayWorkout.exercises.length} bài`} tone="primary" />
              </View>
              {todayWorkout.exercises.slice(0, 3).map((ex, i) => {
                const exObj = typeof ex.exerciseId === "object" ? ex.exerciseId : null;
                return (
                  <View key={ex._id || i} style={styles.exRow}>
                    <View style={styles.exDot} />
                    <Text style={styles.exName} numberOfLines={1}>
                      {exObj?.name || "Bài tập"}
                    </Text>
                    <Text style={styles.exMeta}>
                      {ex.sets}x{ex.reps}
                    </Text>
                  </View>
                );
              })}
              <Text
                style={styles.linkText}
                onPress={() => router.push({ pathname: "/workout/[day]", params: { day: todayWorkout.dayOfWeek } })}
              >
                Bắt đầu buổi tập →
              </Text>
            </View>
          ) : (
            <EmptyRow icon="calendar-outline" text="Chưa có dữ liệu cho hôm nay." />
          )}
        </Card>

        <SectionHeader title="Thống kê tuần này" />
        <View style={styles.statGrid}>
          <MiniStat label="Buổi tập" value={periodStats?.workoutsThisWeek ?? 0} tone={color.primary} />
          <MiniStat label="Ngày ăn chuẩn" value={periodStats?.dietThisWeek ?? 0} tone={color.secondary} />
          <MiniStat label="Điểm rank" value={stats?.rankPoints ?? 0} tone="#8A5E12" />
        </View>
      </View>
    </Screen>
  );
}

function StatusPill({
  done,
  label,
  icon,
}: {
  done: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.pill, done && styles.pillDone]}>
      <Ionicons name={done ? "checkmark-circle" : icon} size={16} color={done ? color.secondary : color.inkFaint} />
      <Text style={[styles.pillText, done && { color: color.secondaryDark }]}>{label}</Text>
    </View>
  );
}

function EmptyRow({
  icon,
  text,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.emptyRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color.inkFaint} />
      <Text style={styles.emptyRowText}>{text}</Text>
    </Wrapper>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card soft style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color: tone }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 60, paddingBottom: 26, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting: { ...type.body, color: "rgba(255,249,242,0.85)" },
  name: { ...type.h1, color: "#FFFFFF", marginTop: 2 },
  body: { paddingHorizontal: 20, marginTop: -18 },
  ringCard: { marginBottom: 16 },
  ringRow: { flexDirection: "row", alignItems: "center" },
  macroCol: { flex: 1, marginLeft: 18 },
  statusRow: { flexDirection: "row", marginBottom: 8, gap: 10 },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pillDone: { backgroundColor: color.secondarySoft },
  pillText: { ...type.bodySmall, color: color.inkFaint, marginLeft: 8, fontFamily: "Inter_500Medium" },
  workoutHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  workoutTitle: { ...type.h3, color: color.ink, flex: 1, marginRight: 8 },
  exRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  exDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primary, marginRight: 10 },
  exName: { ...type.body, color: color.ink, flex: 1 },
  exMeta: { ...type.bodySmall, color: color.inkFaint },
  linkText: { ...type.body, color: color.primary, fontFamily: "Inter_600SemiBold", marginTop: 10 },
  emptyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  emptyRowText: { ...type.body, color: color.inkFaint, marginLeft: 10, flex: 1, lineHeight: 20 },
  statGrid: { flexDirection: "row", gap: 10, marginBottom: 12 },
  miniStat: { flex: 1, alignItems: "center", paddingVertical: 16 },
  miniStatValue: { ...type.h1, fontFamily: "Manrope_800ExtraBold" },
  miniStatLabel: { ...type.bodySmall, color: color.inkFaint, marginTop: 4 },
});
