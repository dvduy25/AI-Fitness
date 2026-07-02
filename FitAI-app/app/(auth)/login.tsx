import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import { color, font, type } from "@/theme/tokens";

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = async () => {
    const nextErrors: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Email không đúng định dạng.";
    if (!password) nextErrors.password = "Vui lòng nhập mật khẩu.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e) {
      toast.show(apiErrorMessage(e, "Đăng nhập thất bại."), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình của bạn</Text>
        </View>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="ban@email.com"
          leftIcon="mail-outline"
          error={errors.email}
        />
        <Input
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          leftIcon="lock-closed-outline"
          error={errors.password}
        />

        <Button label="Đăng nhập" onPress={submit} loading={loading} style={{ marginTop: 8 }} />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <Text style={styles.footerLink} onPress={() => router.push("/(auth)/register")}>
            Đăng ký ngay
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 24, marginBottom: 28 },
  title: { ...type.display, color: color.ink },
  subtitle: { ...type.body, color: color.inkFaint, marginTop: 8 },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 22 },
  footerText: { ...type.body, color: color.inkFaint },
  footerLink: { ...type.body, fontFamily: font.bodySemi, color: color.primary },
});
