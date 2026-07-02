import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getApiBaseUrl, setApiBaseUrl } from "@/api/client";
import { useToast } from "@/context/ToastContext";
import { color, type } from "@/theme/tokens";

export default function ServerSettings() {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setUrl(getApiBaseUrl());
  }, []);

  const save = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await setApiBaseUrl(url);
      toast.show("Đã lưu địa chỉ máy chủ", "success");
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Địa chỉ máy chủ</Text>
      <Text style={styles.desc}>
        Nhập địa chỉ IP LAN của máy chạy backend Node.js, ví dụ http://192.168.1.20:5000/api. Không dùng
        "localhost" vì điện thoại không truy cập được vào máy tính qua tên đó.
      </Text>
      <Input
        label="API URL"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://192.168.1.20:5000/api"
        leftIcon="server-outline"
      />
      <Button label="Lưu" onPress={save} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: color.ink, marginTop: 12, marginBottom: 8 },
  desc: { ...type.body, color: color.inkFaint, marginBottom: 24, lineHeight: 20 },
});
