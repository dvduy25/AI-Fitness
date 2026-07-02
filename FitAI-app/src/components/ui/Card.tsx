import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { color, radius, shadow, space, type } from "@/theme/tokens";

export function Card({
  children,
  style,
  soft = false,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  soft?: boolean;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, soft && styles.cardSoft, style, pressed && { opacity: 0.9 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, soft && styles.cardSoft, style]}>{children}</View>;
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon}
      <Text style={[styles.chipText, selected && styles.chipTextSelected, icon ? { marginLeft: 6 } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({
  label,
  tone = "primary",
}: {
  label: string;
  tone?: "primary" | "secondary" | "gold" | "danger" | "neutral";
}) {
  const map: Record<string, { bg: string; text: string }> = {
    primary: { bg: color.primarySoft, text: color.primaryDark },
    secondary: { bg: color.secondarySoft, text: color.secondaryDark },
    gold: { bg: color.goldSoft, text: "#8A5E12" },
    danger: { bg: color.dangerSoft, text: color.danger },
    neutral: { bg: color.surfaceSoft, text: color.inkSoft },
  };
  const t = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.text }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  subtitle,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  cardSoft: {
    backgroundColor: color.surfaceSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1.5,
    borderColor: color.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: color.ink, borderColor: color.ink },
  chipText: { ...type.body, fontFamily: "Inter_500Medium", color: color.inkSoft },
  chipTextSelected: { color: "#FFFFFF" },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: "flex-start" },
  badgeText: { ...type.bodySmall, fontFamily: "Inter_600SemiBold" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: space.md,
    marginTop: space.sm,
  },
  sectionTitle: { ...type.h2, color: color.ink },
  sectionSubtitle: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  sectionAction: { ...type.body, fontFamily: "Inter_600SemiBold", color: color.primary },
});
