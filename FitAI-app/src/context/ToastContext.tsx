import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, font, radius } from "@/theme/tokens";

interface ToastState {
  message: string;
  tone: "success" | "error" | "info";
}

const ToastContext = createContext<{ show: (message: string, tone?: ToastState["tone"]) => void } | undefined>(
  undefined
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, tone: ToastState["tone"] = "info") => {
      setToast({ message, tone });
      opacity.setValue(0);
      translateY.setValue(20);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
      ]).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2600);
    },
    [opacity, translateY]
  );

  const toneStyle = {
    success: { bg: color.secondary, icon: "checkmark-circle" as const },
    error: { bg: color.danger, icon: "alert-circle" as const },
    info: { bg: color.ink, icon: "information-circle" as const },
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: toneStyle[toast.tone].bg, opacity, transform: [{ translateY }] },
          ]}
        >
          <Ionicons name={toneStyle[toast.tone].icon} size={18} color="#fff" />
          <Text style={styles.text} numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 46,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 999,
  },
  text: { color: "#fff", fontFamily: font.bodyMed, fontSize: 13.5, marginLeft: 10, flex: 1 },
});
