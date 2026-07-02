import React from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { color, font, radius, space } from "@/theme/tokens";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

interface ButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  trailingIcon,
  fullWidth = true,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const palette = variantStyles[variant];
  const sizing = sizeStyles[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizing.container,
        { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: palette.borderWidth },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[sizing.text, { color: palette.text, fontFamily: font.bodySemi }, icon ? { marginLeft: 8 } : null]}>
            {label}
          </Text>
          {trailingIcon}
        </View>
      )}
    </Pressable>
  );
}

const variantStyles: Record<Variant, { bg: string; text: string; border: string; borderWidth: number }> = {
  primary: { bg: color.primary, text: "#FFFFFF", border: "transparent", borderWidth: 0 },
  secondary: { bg: color.secondary, text: "#FFFFFF", border: "transparent", borderWidth: 0 },
  outline: { bg: "transparent", text: color.ink, border: color.borderStrong, borderWidth: 1.5 },
  ghost: { bg: "transparent", text: color.primary, border: "transparent", borderWidth: 0 },
  danger: { bg: color.dangerSoft, text: color.danger, border: "transparent", borderWidth: 0 },
};

const sizeStyles: Record<Size, { container: ViewStyle; text: { fontSize: number } }> = {
  sm: { container: { paddingVertical: 9, paddingHorizontal: space.md, borderRadius: radius.sm }, text: { fontSize: 13 } },
  md: { container: { paddingVertical: 14, paddingHorizontal: space.lg, borderRadius: radius.md }, text: { fontSize: 15 } },
  lg: { container: { paddingVertical: 17, paddingHorizontal: space.xl, borderRadius: radius.md }, text: { fontSize: 16 } },
};

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  fullWidth: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
