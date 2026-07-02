import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, font, radius, space, type } from "@/theme/tokens";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  suffix?: string;
  containerStyle?: object;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  suffix,
  secureTextEntry,
  containerStyle,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error && styles.fieldError,
        ]}
      >
        {leftIcon ? (
          <Ionicons name={leftIcon} size={18} color={focused ? color.primary : color.inkFaint} style={styles.icon} />
        ) : null}
        <TextInput
          placeholderTextColor={color.inkFaint}
          style={styles.input}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={19} color={color.inkFaint} />
          </Pressable>
        ) : suffix ? (
          <Text style={styles.suffix}>{suffix}</Text>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { ...type.label, color: color.inkSoft, marginBottom: 7, textTransform: "uppercase" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.border,
    paddingHorizontal: space.md,
    height: 52,
  },
  fieldFocused: { borderColor: color.primary },
  fieldError: { borderColor: color.danger },
  icon: { marginRight: 8 },
  input: { flex: 1, fontFamily: font.body, fontSize: 15.5, color: color.ink, height: "100%" },
  suffix: { ...type.bodySmall, color: color.inkFaint, marginLeft: 6 },
  error: { ...type.bodySmall, color: color.danger, marginTop: 6 },
  hint: { ...type.bodySmall, color: color.inkFaint, marginTop: 6 },
});
