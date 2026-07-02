import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, font, radius, type } from "@/theme/tokens";
import { Button } from "./Button";

export function EmptyState({
  icon = "sparkles-outline",
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={color.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel ? (
        <Button label={actionLabel} onPress={onAction} size="sm" fullWidth={false} style={{ marginTop: 16 }} />
      ) : null}
    </View>
  );
}

export function LoadingScreen({ label }: { label?: string }) {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={color.primary} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function Avatar({ uri, name, size = 44 }: { uri?: string; name?: string; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={{ fontFamily: font.displaySemi, fontSize: size * 0.4, color: color.primaryDark }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.primarySofter,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { ...type.h3, color: color.ink, textAlign: "center" },
  desc: { ...type.body, color: color.inkFaint, textAlign: "center", marginTop: 6, lineHeight: 20 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.bg },
  loadingLabel: { ...type.body, color: color.inkFaint, marginTop: 12 },
  avatarFallback: { backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center" },
});
