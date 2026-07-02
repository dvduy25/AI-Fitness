import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import { authApi } from "@/api/auth";
import { color, type } from "@/theme/tokens";

export default function ChangePassword() {
  const toast = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!oldPassword) next.oldPassword = "Nhập mật khẩu hiện tại.";
    if (newPassword.length < 6) next.newPassword = "Mật khẩu mới cần tối thiểu 6 ký tự.";
    if (newPassword !== confirmPassword) next.confirmPassword = "Mật khẩu xác nhận không khớp.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      toast.show("Đã đổi mật khẩu thành công", "success");
      router.back();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={color.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
      </View>

      <Input
        label="Mật khẩu hiện tại"
        value={oldPassword}
        onChangeText={setOldPassword}
        secureTextEntry
        leftIcon="lock-closed-outline"
        error={errors.oldPassword}
      />
      <Input
        label="Mật khẩu mới"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        leftIcon="key-outline"
        error={errors.newPassword}
      />
      <Input
        label="Xác nhận mật khẩu mới"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        leftIcon="key-outline"
        error={errors.confirmPassword}
      />

      <Button label="Cập nhật mật khẩu" onPress={submit} loading={saving} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 20 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: { ...type.h1, color: color.ink, flex: 1 },
});
