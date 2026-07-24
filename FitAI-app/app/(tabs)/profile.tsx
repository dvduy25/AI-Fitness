import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Badge } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { color, font, radius, type } from "@/theme/tokens";

const GOAL_LABEL: Record<string, string> = {
  lose_weight: "Giảm cân",
  gain_muscle: "Tăng cơ",
  maintain: "Duy trì vóc dáng",
};
const LEVEL_LABEL: Record<string, string> = {
  beginner: "Mới bắt đầu",
  intermediate: "Trung bình",
  advanced: "Nâng cao",
};
const LOCATION_LABEL: Record<string, string> = { home: "Tại nhà", gym: "Phòng gym" };

export default function ProfileTab() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const doLogout = async () => {
    await logout();
    router.replace("/(auth)/welcome");
  };

  return (
    <Screen contentStyle={{ paddingBottom: 130 }}>
      <View style={styles.headTop}>
        <Text style={styles.header}>Hồ sơ</Text>
        {user?.isPremium ? <Badge label="Premium" tone="gold" /> : null}
      </View>

      <Card style={styles.profileCard}>
        <Avatar uri={user?.avatar} name={user?.name} size={64} />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Pressable style={styles.editBtn} onPress={() => router.push("/profile/edit")}>
          <Ionicons name="create-outline" size={15} color={color.primary} />
          <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
        </Pressable>
      </Card>

      <View style={styles.metaGrid}>
        <MetaCard icon="body-outline" label="Chiều cao" value={user?.height ? `${user.height} cm` : "—"} />
        <MetaCard icon="scale-outline" label="Cân nặng" value={user?.weight ? `${user.weight} kg` : "—"} />
        <MetaCard icon="calendar-outline" label="Tuổi" value={user?.age ? `${user.age}` : "—"} />
      </View>

      <Text style={styles.sectionTitle}>Mục tiêu tập luyện</Text>
      <Card style={{ marginBottom: 20 }}>
        <InfoRow label="Mục tiêu" value={user?.goal ? GOAL_LABEL[user.goal] : "—"} />
        <InfoRow label="Trình độ" value={user?.fitnessLevel ? LEVEL_LABEL[user.fitnessLevel] : "—"} />
        <InfoRow label="Nơi tập" value={user?.workoutLocation ? LOCATION_LABEL[user.workoutLocation] : "—"} last />
      </Card>

      {user?.role === "user" ? (
        <>
          <Text style={styles.sectionTitle}>Huấn luyện viên</Text>
          <Card style={{ marginBottom: 24 }}>
            <SettingRow icon="calendar-outline" label="Lịch đã đặt với PT" onPress={() => router.push("/pt/my-bookings")} />
            <SettingRow icon="bookmark-outline" label="Kho lưu trữ của tôi" onPress={() => router.push("/library")} last />
          </Card>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Cài đặt</Text>
      <Card style={{ marginBottom: 24 }}>
        <SettingRow icon="notifications-outline" label="Thông báo" onPress={() => router.push("/notifications")} />
        <SettingRow icon="key-outline" label="Đổi mật khẩu" onPress={() => router.push("/profile/change-password")} />
        <SettingRow icon="server-outline" label="Địa chỉ máy chủ" onPress={() => router.push("/(auth)/server-settings")} />
        <SettingRow
          icon="log-out-outline"
          label="Đăng xuất"
          danger
          last
          onPress={() => setConfirmingLogout(true)}
        />
      </Card>

      {confirmingLogout ? (
        <Card style={{ marginBottom: 20 }} soft>
          <Text style={styles.confirmText}>Bạn có chắc muốn đăng xuất?</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Button label="Hủy" variant="outline" onPress={() => setConfirmingLogout(false)} style={{ flex: 1 }} />
            <Button label="Đăng xuất" variant="danger" onPress={doLogout} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function MetaCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <Card soft style={styles.metaCard}>
      <Ionicons name={icon} size={17} color={color.primary} style={{ marginBottom: 8 }} />
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
    </Card>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  onPress,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.settingRow, !last && styles.infoRowBorder]} onPress={onPress}>
      <Ionicons name={icon} size={19} color={danger ? color.danger : color.inkSoft} style={{ marginRight: 12 }} />
      <Text style={[styles.settingLabel, danger && { color: color.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={color.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 16 },
  header: { ...type.display, color: color.ink },
  profileCard: { alignItems: "center", paddingVertical: 26, marginBottom: 16 },
  name: { ...type.h1, color: color.ink, marginTop: 12 },
  email: { ...type.body, color: color.inkFaint, marginTop: 3 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.primarySofter,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginTop: 14,
  },
  editBtnText: { ...type.bodySmall, color: color.primary, fontFamily: font.bodySemi, marginLeft: 5 },
  metaGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  metaCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
  metaValue: { ...type.h3, color: color.ink },
  metaLabel: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  sectionTitle: { ...type.h2, color: color.ink, marginBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: color.border },
  infoLabel: { ...type.body, color: color.inkFaint },
  infoValue: { ...type.body, color: color.ink, fontFamily: font.bodySemi },
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13 },
  settingLabel: { ...type.body, color: color.ink, flex: 1 },
  confirmText: { ...type.body, color: color.ink },
});
