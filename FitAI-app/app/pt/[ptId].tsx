import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Avatar, EmptyState, LoadingScreen } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { ptApi } from "@/api/pt";
import { apiErrorMessage } from "@/api/client";
import { color, font, radius, type } from "@/theme/tokens";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}
function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
}

export default function PTProfileScreen() {
  const { ptId } = useLocalSearchParams<{ ptId: string }>();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dateOffset, setDateOffset] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof ptApi.getAvailabilityForUser>> | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ _id: string; startTime: string; endTime: string } | null>(null);
  const [price, setPrice] = useState("");
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const date = toDateStr(new Date(Date.now() + dateOffset * 86400000));

  const load = useCallback(async () => {
    if (!ptId) return;
    setLoading(true);
    setSelectedSlot(null);
    try {
      const res = await ptApi.getAvailabilityForUser(ptId, date);
      setData(res);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptId, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const submit = async () => {
    if (!selectedSlot || !data) return;
    const priceNum = Number(price.replace(/[^0-9]/g, ""));
    if (!priceNum || priceNum <= 0) {
      toast.show("Nhập mức giá buổi tập (VNĐ) đã thoả thuận với PT.", "info");
      return;
    }
    setSubmitting(true);
    try {
      if (!data.availabilityId) {
        toast.show("Không thể xác định lịch rảnh này. Vui lòng thử lại.", "error");
        setSubmitting(false);
        return;
      }
      await ptApi.createHireRequest({
        ptId: ptId!,
        availabilityId: data.availabilityId,
        slotId: selectedSlot._id,
        goal,
        price: priceNum,
      });
      toast.show("Đã gửi yêu cầu đặt lịch! Chờ PT xác nhận.", "success");
      router.replace("/pt/my-bookings");
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) return <LoadingScreen label="Đang tải hồ sơ PT..." />;

  return (
    <Screen contentStyle={{ paddingBottom: 60 }}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={color.ink} />
        <Text style={styles.backText}>Quay lại</Text>
      </Pressable>

      <Card style={styles.profileCard}>
        <Avatar uri={data?.pt?.avatar} name={data?.pt?.name} size={64} />
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
          <Text style={styles.name}>{data?.pt?.name || "PT"}</Text>
          {data?.pt?.isVerified ? (
            <Ionicons name="checkmark-circle" size={16} color={color.primary} style={{ marginLeft: 5 }} />
          ) : null}
        </View>
        {data?.location ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <Ionicons name="location-outline" size={13} color={color.inkFaint} />
            <Text style={styles.location}>{data.location}</Text>
          </View>
        ) : null}
        <Pressable style={styles.viewBookingsBtn} onPress={() => router.push("/pt/my-bookings")}>
          <Text style={styles.viewBookingsText}>Xem lịch đã đặt của tôi</Text>
        </Pressable>
      </Card>

      <View style={styles.dateNav}>
        <Pressable onPress={() => setDateOffset((o) => Math.max(0, o - 1))} disabled={dateOffset === 0}>
          <Ionicons name="chevron-back-circle-outline" size={26} color={dateOffset === 0 ? color.border : color.primary} />
        </Pressable>
        <Text style={styles.dateLabel}>{formatDateLabel(date)}</Text>
        <Pressable onPress={() => setDateOffset((o) => Math.min(13, o + 1))}>
          <Ionicons name="chevron-forward-circle-outline" size={26} color={color.primary} />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Khung giờ rảnh</Text>
      {loading ? (
        <LoadingScreen label="" />
      ) : !data?.available || (data?.freeSlots?.length ?? 0) === 0 ? (
        <EmptyState icon="calendar-outline" title="PT không rảnh ngày này" description="Hãy thử chọn ngày khác." />
      ) : (
        <View style={styles.slotsGrid}>
          {data.freeSlots.map((s) => (
            <Pressable
              key={s._id}
              style={[styles.slotChip, selectedSlot?._id === s._id && styles.slotChipActive]}
              onPress={() => setSelectedSlot(s)}
            >
              <Text style={[styles.slotChipText, selectedSlot?._id === s._id && styles.slotChipTextActive]}>
                {s.startTime} - {s.endTime}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {selectedSlot ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Xác nhận đặt lịch</Text>
          <Input
            label="Mục tiêu buổi tập (tuỳ chọn)"
            placeholder="VD: Tập tăng cơ tay, chỉnh tư thế squat..."
            value={goal}
            onChangeText={setGoal}
            multiline
          />
          <Input
            label="Giá đã thoả thuận (VNĐ)"
            placeholder="VD: 200000"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
          <Button label="Gửi yêu cầu đặt lịch" onPress={submit} loading={submitting} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 4 },
  backText: { ...type.body, color: color.ink, marginLeft: 2 },
  profileCard: { alignItems: "center", paddingVertical: 22, marginBottom: 16 },
  name: { ...type.h2, color: color.ink },
  location: { ...type.bodySmall, color: color.inkFaint, marginLeft: 3 },
  viewBookingsBtn: { marginTop: 12, backgroundColor: color.primarySofter, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  viewBookingsText: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.primary },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 16 },
  dateLabel: { ...type.body, fontFamily: font.bodySemi, color: color.ink, textTransform: "capitalize" },
  sectionTitle: { ...type.h3, color: color.ink, marginBottom: 10 },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    backgroundColor: color.secondarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  slotChipActive: { backgroundColor: color.primarySoft, borderColor: color.primary },
  slotChipText: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.secondaryDark },
  slotChipTextActive: { color: color.primaryDark },
});
