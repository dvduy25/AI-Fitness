import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Badge } from "@/components/ui/Card";
import { Avatar, EmptyState, LoadingScreen } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

export default function MyBookingsScreen() {
  const toast = useToast();
  const [requests, setRequests] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<HireRequest | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await ptApi.getMyRequests();
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

  const cancel = (r: HireRequest) => {
    Alert.alert("Huỷ lịch hẹn", "Bạn chắc chắn muốn huỷ lịch hẹn này?", [
      { text: "Không", style: "cancel" },
      {
        text: "Huỷ lịch",
        style: "destructive",
        onPress: async () => {
          try {
            await ptApi.cancelRequest(r._id);
            toast.show("Đã huỷ lịch hẹn.", "success");
            load();
          } catch (e) {
            toast.show(apiErrorMessage(e), "error");
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen label="Đang tải lịch đã đặt..." />;

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.title}>Lịch đã đặt với PT</Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(r) => r._id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <EmptyState icon="calendar-outline" title="Chưa có lịch hẹn nào" description="Hãy tìm PT phù hợp và đặt lịch đầu tiên." />
        }
        renderItem={({ item }) => {
          const pt = typeof item.ptId === "object" ? item.ptId : null;
          return (
            <Card style={{ marginBottom: 12 }}>
              <View style={styles.rowTop}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Avatar uri={pt?.avatar} name={pt?.name} size={40} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.ptName}>{pt?.name || "PT"}</Text>
                    <Text style={styles.dateText}>
                      {new Date(item.date).toLocaleDateString("vi-VN")} • {item.startTime}-{item.endTime}
                    </Text>
                  </View>
                </View>
                <Badge label={STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
              </View>

              {item.goal ? <Text style={styles.goal}>Mục tiêu: {item.goal}</Text> : null}
              {item.status === "rejected" && item.rejectReason ? (
                <Text style={styles.rejectReason}>Lý do từ chối: {item.rejectReason}</Text>
              ) : null}

              {item.status === "pending" || item.status === "confirmed" ? (
                <Button label="Huỷ lịch hẹn" variant="outline" size="sm" onPress={() => cancel(item)} />
              ) : null}

              {item.status === "completed" && !item.rating ? (
                <Button label="Đánh giá PT" variant="ghost" size="sm" onPress={() => setReviewing(item)} />
              ) : null}
              {item.status === "completed" && item.rating ? (
                <View style={styles.ratedRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name={i < item.rating! ? "star" : "star-outline"} size={14} color="#E0A100" />
                  ))}
                </View>
              ) : null}
            </Card>
          );
        }}
      />

      {reviewing ? (
        <ReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            load();
          }}
        />
      ) : null}
    </Screen>
  );
}

function ReviewModal({ request, onClose, onDone }: { request: HireRequest; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await ptApi.reviewPT(request._id, rating, review);
      toast.show("Cảm ơn bạn đã đánh giá!", "success");
      onDone();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.modalBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Card style={styles.modalCard}>
        <Text style={styles.title}>Đánh giá buổi tập</Text>
        <View style={styles.starsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Pressable key={i} onPress={() => setRating(i + 1)}>
              <Ionicons name={i < rating ? "star" : "star-outline"} size={28} color="#E0A100" />
            </Pressable>
          ))}
        </View>
        <Input placeholder="Nhận xét về PT (tuỳ chọn)" value={review} onChangeText={setReview} multiline />
        <Button label="Gửi đánh giá" onPress={submit} loading={sending} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  backBtn: { marginRight: 8 },
  title: { ...type.h2, color: color.ink },
  rowTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  ptName: { ...type.body, fontFamily: font.bodySemi, color: color.ink },
  dateText: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  goal: { ...type.bodySmall, color: color.inkSoft, marginBottom: 10 },
  rejectReason: { ...type.bodySmall, color: color.danger, marginBottom: 10 },
  ratedRow: { flexDirection: "row", gap: 3, marginTop: 4 },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(20,17,14,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { width: "100%" },
  starsRow: { flexDirection: "row", gap: 6, justifyContent: "center", marginVertical: 14 },
});
