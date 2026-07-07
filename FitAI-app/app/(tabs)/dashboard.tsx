import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ptApi } from "@/api/pt";
import { savesApi } from "@/api/saves";
import { postsApi } from "@/api/posts";
import { apiErrorMessage } from "@/api/client";
import { color, font, radius, type } from "@/theme/tokens";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function DashboardTab() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [todaySlots, setTodaySlots] = useState<{ total: number; free: number }>({ total: 0, free: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const [saveStats, setSaveStats] = useState<{ totalSaves: number; topPosts: any[] }>({ totalSaves: 0, topPosts: [] });
  const [sharing, setSharing] = useState<"workout" | "diet" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const month = toDateStr(new Date()).slice(0, 7);
      const [records, incoming, stats] = await Promise.all([
        ptApi.getMyAvailability(month),
        ptApi.getIncomingRequests("pending"),
        savesApi.getMySaveStats(),
      ]);
      const today = records.find((r) => r.date === toDateStr(new Date()));
      setTodaySlots({
        total: today?.slots.length ?? 0,
        free: today?.slots.filter((s) => !s.isBooked).length ?? 0,
      });
      setPendingCount(incoming.length);
      setSaveStats(stats);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const share = async (shareType: "workout" | "diet") => {
    setSharing(shareType);
    try {
      const res = await postsApi.shareMaster(shareType);
      if (res.success) {
        toast.show("Đã chia sẻ lên bảng tin!", "success");
      } else {
        toast.show(res.message || "Không thể chia sẻ.", "error");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || apiErrorMessage(e);
      toast.show(
        msg?.includes("thiết lập")
          ? shareType === "workout"
            ? "Bạn cần tạo lịch tập mẫu trước ở tab Tập luyện."
            : "Bạn cần tạo thực đơn mẫu trước ở tab Dinh dưỡng."
          : msg,
        "info"
      );
    } finally {
      setSharing(null);
    }
  };

  return (
    <Screen>
      <Text style={styles.header}>Xin chào, {user?.name?.split(" ").slice(-1)[0] || "PT"} 👋</Text>
      <Text style={styles.subheader}>Đây là tổng quan hoạt động huấn luyện của bạn hôm nay.</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={color.primary} />
      ) : (
        <>
          <View style={styles.statsRow}>
            <Card style={styles.statCard} soft>
              <Ionicons name="time-outline" size={20} color={color.primary} />
              <Text style={styles.statValue}>
                {todaySlots.free}/{todaySlots.total}
              </Text>
              <Text style={styles.statLabel}>Khung rảnh hôm nay</Text>
            </Card>
            <Card style={styles.statCard} soft>
              <Ionicons name="bookmark-outline" size={20} color="#8A5E12" />
              <Text style={styles.statValue}>{saveStats.totalSaves.toLocaleString("vi-VN")}</Text>
              <Text style={styles.statLabel}>Tổng lượt lưu</Text>
            </Card>
          </View>

          <Pressable style={styles.pendingCard} onPress={() => router.push("/pt/incoming")}>
            <View style={styles.pendingIconWrap}>
              <Ionicons name="people-outline" size={20} color={color.secondaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingTitle}>{pendingCount} yêu cầu đang chờ xác nhận</Text>
              <Text style={styles.pendingSub}>Xem & phản hồi học viên</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
          </Pressable>

          <SectionHeader title="Quản lý lịch dạy" />
          <View style={styles.actionsGrid}>
            <ActionTile
              icon="calendar-outline"
              label="Lịch rảnh"
              onPress={() => router.push("/pt/availability-manage")}
            />
            <ActionTile icon="people-outline" label="Học viên" onPress={() => router.push("/pt/incoming")} />
          </View>

          <SectionHeader title="Chia sẻ lên bảng tin" subtitle="Thu hút học viên mới bằng lịch tập & thực đơn mẫu" />
          <Card>
            <Button
              label="Chia sẻ lịch tập mẫu"
              variant="outline"
              onPress={() => share("workout")}
              loading={sharing === "workout"}
              icon={<Ionicons name="barbell-outline" size={17} color={color.ink} />}
              style={{ marginBottom: 10 }}
            />
            <Button
              label="Chia sẻ thực đơn mẫu"
              variant="outline"
              onPress={() => share("diet")}
              loading={sharing === "diet"}
              icon={<Ionicons name="nutrition-outline" size={17} color={color.ink} />}
            />
          </Card>

          {saveStats.topPosts.length > 0 ? (
            <>
              <SectionHeader title="Bài viết được lưu nhiều nhất" />
              <Card>
                {saveStats.topPosts.map((p, i) => (
                  <View key={p._id} style={[styles.topPostRow, i > 0 && styles.topPostRowBorder]}>
                    <Text style={styles.topPostContent} numberOfLines={1}>
                      {p.post?.content || "Bài viết"}
                    </Text>
                    <Text style={styles.topPostCount}>{p.post?.savesCount ?? p.count} lượt lưu</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function ActionTile({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.actionTile} onPress={onPress}>
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={20} color={color.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { ...type.display, color: color.ink, marginTop: 6 },
  subheader: { ...type.body, color: color.inkFaint, marginTop: 4, marginBottom: 18 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: { flex: 1, alignItems: "flex-start" },
  statValue: { ...type.h2, color: color.ink, marginTop: 8 },
  statLabel: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.secondarySoft,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 20,
  },
  pendingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingTitle: { ...type.body, fontFamily: font.bodySemi, color: color.ink },
  pendingSub: { ...type.bodySmall, color: color.inkFaint, marginTop: 1 },
  actionsGrid: { flexDirection: "row", gap: 12, marginBottom: 8 },
  actionTile: {
    flex: 1,
    alignItems: "center",
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.border,
    paddingVertical: 16,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: color.primarySofter,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLabel: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.ink },
  topPostRow: { paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  topPostRowBorder: { borderTopWidth: 1, borderTopColor: color.border },
  topPostContent: { ...type.bodySmall, color: color.inkSoft, flex: 1 },
  topPostCount: { ...type.bodySmall, fontFamily: font.bodySemi, color: "#8A5E12" },
});
