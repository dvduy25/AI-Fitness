import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { color, font, radius } from "@/theme/tokens";

export function MacroBar({
  label,
  current,
  target,
  tint,
  unit = "g",
}: {
  label: string;
  current: number;
  target: number;
  tint: string;
  unit?: string;
}) {
  const pct = target > 0 ? Math.min(current / target, 1) : 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <View style={[styles.dot, { backgroundColor: tint }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>
          {Math.round(current)}
          <Text style={styles.valueTarget}> / {Math.round(target)}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: tint }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 },
  labelLeft: { flexDirection: "row", alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  label: { fontFamily: font.bodyMed, fontSize: 13, color: color.inkSoft },
  value: { fontFamily: font.bodySemi, fontSize: 13, color: color.ink },
  valueTarget: { fontFamily: font.body, color: color.inkFaint },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: color.surfaceSoft, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.pill },
});
