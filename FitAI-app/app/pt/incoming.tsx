import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Badge } from "@/components/ui/Card";
import { Avatar, EmptyState, LoadingScreen } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { ptApi } from "@/api/pt";
import { apiErrorMessage } from "@/api/client";
import { color, font, type } from "@/theme/tokens";
import type { HireRequest } from "@/types";

const STATUS_LABEL: Record<HireRequest["status"], string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  rejected: "Đã từ chối",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};
const STATUS_TONE: Record<HireRequest["status"], "primary" | "secondary" | "gold" | "danger" | "neutral"> = {
  pending: "gold",
  confirmed: "secondary",
  rejected: "danger",
  completed: "primary",
  cancelled: "neutral",
};

export default function IncomingRequestsScreen() {
  const toast = useToast();
  const [requests, setRequests] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await ptApi.getIncomingRequests();
      setRequests(list);
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

  const confirm = async (r: HireRequest) => {
    setBusyId(r._id);
    try {
      await ptApi.confirmRequest(r._id);
      toast.show("Đã xác nhận lịch hẹn.", "success");
      load();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const reject = (r: HireRequest) => {
    Alert.alert("Từ chối yêu cầu", "Bạn chắc chắn muốn từ chối yêu cầu này?", [
      { text: "Không", style: "cancel" },
      {
        text: "Từ chối",
        style: "destructive",
        onPress: async () => {
          setBusyId(r._id);
          try {
            await ptApi.rejectRequest(r._id, "PT không thể sắp xếp buổi tập này.");
            toast.show("Đã từ chối yêu cầu.", "info");
            load();
          } catch (e) {
            toast.show(apiErrorMessage(e), "error");
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const complete = async (r: HireRequest) => {
    setBusyId(r._id);
    try {
      await ptApi.completeRequest(r._id);
      toast.show("Đã đánh dấu hoàn thành buổi tập.", "success");
      load();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingScreen label="Đang tải yêu cầu học viên..." />;

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.title}>Yêu cầu từ học viên</Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(r) => r._id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <EmptyState icon="people-outline" title="Chưa có yêu cầu nào" description="Yêu cầu đặt lịch từ học viên sẽ xuất hiện tại đây." />
        }
        renderItem={({ item }) => {
          const student = typeof item.userId === "object" ? item.userId : null;
          const busy = busyId === item._id;
          return (
            <Card style={{ marginBottom: 12 }}>
              <View style={styles.rowTop}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Avatar uri={student?.avatar} name={student?.name} size={40} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.name}>{student?.name || "Học viên"}</Text>
                    <Text style={styles.dateText}>
                      {new Date(item.date).toLocaleDateString("vi-VN")} • {item.startTime}-{item.endTime}
                    </Text>
                  </View>
                </View>
                <Badge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
              </View>

              {item.goal ? <Text style={styles.goal}>Mục tiêu: {item.goal}</Text> : null}

              {item.status === "pending" ? (
                <View style={styles.actionsRow}>
                  <Button label="Từ chối" variant="outline" size="sm" onPress={() => reject(item)} disabled={busy} style={{ flex: 1 }} />
                  <Button label="Xác nhận" variant="primary" size="sm" onPress={() => confirm(item)} loading={busy} style={{ flex: 1 }} />
                </View>
              ) : null}

              {item.status === "confirmed" ? (
                <Button label="Đánh dấu hoàn thành" variant="secondary" size="sm" onPress={() => complete(item)} loading={busy} />
              ) : null}
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  backBtn: { marginRight: 8 },
  title: { ...type.h2, color: color.ink },
  rowTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  name: { ...type.body, fontFamily: font.bodySemi, color: color.ink },
  dateText: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  goal: { ...type.bodySmall, color: color.inkSoft, marginBottom: 10 },
  actionsRow: { flexDirection: "row", gap: 8 },
});
