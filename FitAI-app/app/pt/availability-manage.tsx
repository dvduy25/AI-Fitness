import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { ptApi } from "@/api/pt";
import { apiErrorMessage } from "@/api/client";
import { color, font, radius, type } from "@/theme/tokens";
import type { PTAvailabilityRecord } from "@/types";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}
function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
}

export default function AvailabilityManageScreen() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dateOffset, setDateOffset] = useState(0);
  const [records, setRecords] = useState<PTAvailabilityRecord[]>([]);
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);

  const date = toDateStr(new Date(Date.now() + dateOffset * 86400000));
  const month = date.slice(0, 7);
  const currentRecord = records.find((r) => r.date === date) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ptApi.getMyAvailability(month);
      setRecords(list);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addSlot = async () => {
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      toast.show("Nhập giờ theo định dạng HH:mm, VD 07:00", "info");
      return;
    }
    if (startTime >= endTime) {
      toast.show("Giờ bắt đầu phải trước giờ kết thúc.", "info");
      return;
    }
    const existingSlots = (currentRecord?.slots || []).map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
    if (existingSlots.some((s) => s.startTime === startTime)) {
      toast.show("Khung giờ này đã tồn tại.", "info");
      return;
    }
    setSaving(true);
    try {
      await ptApi.setAvailability({
        date,
        slots: [...existingSlots, { startTime, endTime }],
        isAvailable: true,
        location: location || currentRecord?.location || undefined,
      });
      toast.show("Đã thêm khung giờ rảnh.", "success");
      setStartTime("");
      setEndTime("");
      load();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const removeSlot = async (startTimeToRemove: string) => {
    const slot = currentRecord?.slots.find((s) => s.startTime === startTimeToRemove);
    if (slot?.isBooked) {
      toast.show("Không thể xoá khung giờ đã có học viên đặt.", "info");
      return;
    }
    const remaining = (currentRecord?.slots || [])
      .filter((s) => s.startTime !== startTimeToRemove)
      .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
    setSaving(true);
    try {
      if (remaining.length === 0) {
        await ptApi.deleteAvailability(date);
      } else {
        await ptApi.setAvailability({ date, slots: remaining, isAvailable: true, location: currentRecord?.location || undefined });
      }
      load();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const clearDay = () => {
    Alert.alert("Xoá lịch rảnh", `Xoá toàn bộ khung giờ rảnh ngày ${formatDateLabel(date)}?`, [
      { text: "Không", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            await ptApi.deleteAvailability(date);
            toast.show("Đã xoá lịch rảnh.", "success");
            load();
          } catch (e) {
            toast.show(apiErrorMessage(e), "error");
          }
        },
      },
    ]);
  };

  return (
    <Screen contentStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.title}>Quản lý lịch rảnh</Text>
      </View>

      <View style={styles.dateNav}>
        <Pressable onPress={() => setDateOffset((o) => Math.max(0, o - 1))} disabled={dateOffset === 0}>
          <Ionicons name="chevron-back-circle-outline" size={26} color={dateOffset === 0 ? color.border : color.primary} />
        </Pressable>
        <Text style={styles.dateLabel}>{formatDateLabel(date)}</Text>
        <Pressable onPress={() => setDateOffset((o) => Math.min(30, o + 1))}>
          <Ionicons name="chevron-forward-circle-outline" size={26} color={color.primary} />
        </Pressable>
      </View>

      {loading ? (
        <LoadingScreen label="" />
      ) : (
        <>
          <Card style={{ marginBottom: 14 }}>
            <Text style={styles.sectionTitle}>Khung giờ đã tạo</Text>
            {!currentRecord || currentRecord.slots.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có khung giờ nào cho ngày này.</Text>
            ) : (
              <View style={styles.slotsList}>
                {currentRecord.slots.map((s) => (
                  <View key={s._id} style={styles.slotRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.slotTime}>
                        {s.startTime} - {s.endTime}
                      </Text>
                      {s.isBooked ? (
                        <View style={styles.bookedTag}>
                          <Text style={styles.bookedTagText}>Đã có học viên</Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable onPress={() => removeSlot(s.startTime)} disabled={saving}>
                      <Ionicons name="trash-outline" size={18} color={s.isBooked ? color.border : color.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {currentRecord && currentRecord.slots.length > 0 ? (
              <Pressable style={styles.clearBtn} onPress={clearDay}>
                <Text style={styles.clearBtnText}>Xoá toàn bộ ngày này</Text>
              </Pressable>
            ) : null}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Thêm khung giờ mới</Text>
            <Input label="Khu vực / địa điểm tập" placeholder="VD: Phòng gym Quận 1" value={location} onChangeText={setLocation} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Input
                containerStyle={{ flex: 1 }}
                label="Giờ bắt đầu"
                placeholder="07:00"
                value={startTime}
                onChangeText={setStartTime}
              />
              <Input
                containerStyle={{ flex: 1 }}
                label="Giờ kết thúc"
                placeholder="08:00"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
            <Button label="Thêm khung giờ" onPress={addSlot} loading={saving} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, marginTop: 4 },
  title: { ...type.h2, color: color.ink },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 16 },
  dateLabel: { ...type.body, fontFamily: font.bodySemi, color: color.ink, textTransform: "capitalize" },
  sectionTitle: { ...type.h3, color: color.ink, marginBottom: 10 },
  emptyText: { ...type.bodySmall, color: color.inkFaint },
  slotsList: { gap: 8 },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  slotTime: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.ink },
  bookedTag: { backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  bookedTagText: { fontSize: 10, fontFamily: font.bodySemi, color: color.primaryDark },
  clearBtn: { marginTop: 12, alignItems: "center" },
  clearBtnText: { ...type.bodySmall, color: color.danger },
});
