import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { color, font } from "@/theme/tokens";

interface CalorieRingProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
}

export function CalorieRing({
  current,
  target,
  size = 172,
  strokeWidth = 15,
  label = "kcal hôm nay",
  unit = "kcal",
}: CalorieRingProps) {
  const radiusPx = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const pct = target > 0 ? Math.min(current / target, 1) : 0;
  const dashOffset = circumference * (1 - pct);
  const over = target > 0 && current > target;
  const remaining = Math.max(target - current, 0);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF9364" />
            <Stop offset="100%" stopColor={over ? color.danger : color.primary} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusPx}
          stroke={color.surfaceSoft}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusPx}
          stroke="url(#flameGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.number}>{Math.round(current).toLocaleString("vi-VN")}</Text>
        <Text style={styles.unit}>{unit}</Text>
        <Text style={styles.label}>
          {target > 0 ? (over ? `+${Math.round(current - target)} vượt mức` : `còn ${Math.round(remaining)}`) : label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: "absolute", alignItems: "center" },
  number: { fontFamily: font.displaySemi, fontSize: 30, color: color.ink, letterSpacing: -0.5 },
  unit: { fontFamily: font.bodySemi, fontSize: 12, color: color.inkFaint, marginTop: -2 },
  label: { fontFamily: font.bodyMed, fontSize: 11.5, color: color.inkSoft, marginTop: 6 },
});
