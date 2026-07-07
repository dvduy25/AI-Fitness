import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, SectionHeader, Badge } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/Feedback";
import { WeightChart } from "@/components/ui/WeightChart";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import { weightApi, gamificationApi } from "@/api/tracking";
import type { GamificationStats, PeriodStats, WeightEntry } from "@/types";
import { color, font, radius, type } from "@/theme/tokens";

type Period = "week" | "month" | "year";

export default function ProgressTab() {
  const { user, updateLocalUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>("month");
  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  const [newWeight, setNewWeight] = useState("");
  const [logging, setLogging] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  const load = useCallback(
    async (p: Period = period) => {
      try {
        const [weightHistory, gami] = await Promise.all([weightApi.history(p), gamificationApi.stats()]);
        setHistory(weightHistory);
        setStats(gami.stats);
        setPeriodStats(gami.periodStats);
      } catch (e) {
        toast.show(apiErrorMessage(e), "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, toast]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changePeriod = (p: Period) => {
    setPeriod(p);
    setLoading(true);
    load(p);
  };

  const submitWeight = async () => {
    const w = Number(newWeight);
    if (!w || w < 20 || w > 300) {
      toast.show("Nhập cân nặng hợp lệ (kg).", "error");
      return;
    }
    setLogging(true);
    try {
      const res = await weightApi.log(w);
      updateLocalUser({ weight: res.currentWeight, targetMacros: res.newMacros });
      toast.show("Đã cập nhật cân nặng! Macro mục tiêu đã được điều chỉnh.", "success");
      setNewWeight("");
      setShowLogForm(false);
      load();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLogging(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const latestWeight = history.length ? history[history.length - 1].weight : user?.weight;
  const firstWeight = history.length ? history[0].weight : undefined;
  const delta = latestWeight != null && firstWeight != null ? latestWeight - firstWeight : 0;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      contentStyle={{ paddingBottom: 130 }}
    >
      <Text style={styles.header}>Tiến độ</Text>
      <Text style={styles.sub}>Cân nặng &amp; thành tích của bạn</Text>

      <Pressable style={styles.bodyCompCard} onPress={() => router.push("/body-composition")}>
        <View style={styles.bodyCompIconWrap}>
          <Ionicons name="body-outline" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bodyCompTitle}>Phân tích tỷ lệ cơ thể</Text>
          <Text style={styles.bodyCompSub}>Ước tính % mỡ & dựng mô hình 3D theo US Navy Method</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
      </Pressable>

      <Card style={{ marginTop: 8, marginBottom: 16 }}>
        <View style={styles.weightHead}>
          <View>
            <Text style={styles.weightNow}>{latestWeight ? `${latestWeight}` : "—"}</Text>
            <Text style={styles.weightUnit}>kg hiện tại</Text>
          </View>
          {delta !== 0 ? (
            <Badge
              label={`${delta > 0 ? "+" : ""}${delta.toFixed(1)}kg`}
              tone={delta > 0 ? "danger" : "secondary"}
            />
          ) : null}
        </View>

        <View style={styles.periodRow}>
          {(["week", "month", "year"] as Period[]).map((p) => (
            <Pressable key={p} onPress={() => changePeriod(p)} style={[styles.periodChip, period === p && styles.periodChipActive]}>
              <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
                {p === "week" ? "Tuần" : p === "month" ? "Tháng" : "Năm"}
              </Text>
            </Pressable>
          ))}
        </View>

        <WeightChart data={history} />

        {showLogForm ? (
          <View style={styles.logForm}>
            <Input
              label="Cân nặng mới"
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              suffix="kg"
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Hủy" variant="outline" onPress={() => setShowLogForm(false)} style={{ flex: 1 }} />
              <Button label="Lưu" onPress={submitWeight} loading={logging} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <Button label="+ Ghi cân nặng hôm nay" variant="outline" onPress={() => setShowLogForm(true)} style={{ marginTop: 14 }} />
        )}
      </Card>

      <SectionHeader title="Thành tích" />
      <View style={styles.statGrid}>
        <StatCard icon="flame" label="Chuỗi ngày" value={stats?.streak ?? 0} tone={color.primary} />
        <StatCard icon="trophy" label="Điểm rank" value={stats?.rankPoints ?? 0} tone="#8A5E12" />
        <StatCard icon="barbell" label="Tổng buổi tập" value={stats?.totalWorkoutSessions ?? 0} tone={color.secondary} />
        <StatCard icon="nutrition" label="Ngày ăn hoàn hảo" value={stats?.totalPerfectDietDays ?? 0} tone={color.info} />
      </View>

      <SectionHeader title="Tuần này" />
      <Card>
        <StatRow label="Buổi tập đã hoàn thành" value={`${periodStats?.workoutsThisWeek ?? 0} buổi`} />
        <StatRow label="Ngày ăn đúng chuẩn" value={`${periodStats?.dietThisWeek ?? 0} ngày`} />
        <StatRow label="Ngày ăn sai kế hoạch" value={`${stats?.currentWeekTrackers.eatWrong ?? 0} ngày`} last />
      </Card>
    </Screen>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card soft style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: tone + "1A" }]}>
        <Ionicons name={icon} size={17} color={tone} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function StatRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.statRowLine, !last && styles.statRowBorder]}>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={styles.statRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { ...type.display, color: color.ink, marginTop: 8 },
  sub: { ...type.body, color: color.inkFaint, marginTop: 4 },
  bodyCompCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.ink,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 16,
  },
  bodyCompIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyCompTitle: { ...type.body, fontFamily: font.bodySemi, color: "#fff" },
  bodyCompSub: { ...type.bodySmall, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  weightHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  weightNow: { fontFamily: "Manrope_800ExtraBold", fontSize: 34, color: color.ink },
  weightUnit: { ...type.bodySmall, color: color.inkFaint, marginTop: -2 },
  periodRow: { flexDirection: "row", backgroundColor: color.surfaceSoft, borderRadius: radius.md, padding: 4, marginBottom: 14 },
  periodChip: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center" },
  periodChipActive: { backgroundColor: color.surface },
  periodChipText: { fontFamily: font.bodyMed, fontSize: 12.5, color: color.inkFaint },
  periodChipTextActive: { color: color.ink, fontFamily: font.bodySemi },
  logForm: { marginTop: 16 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  statCard: { width: "47%", paddingVertical: 16 },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { ...type.h1, color: color.ink, fontFamily: "Manrope_800ExtraBold" },
  statLabel: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  statRowLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  statRowBorder: { borderBottomWidth: 1, borderBottomColor: color.border },
  statRowLabel: { ...type.body, color: color.inkSoft },
  statRowValue: { ...type.body, color: color.ink, fontFamily: font.bodySemi },
});
