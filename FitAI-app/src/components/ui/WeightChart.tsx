import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { color, font } from "@/theme/tokens";

interface Point {
  date: string;
  weight: number;
}

export function WeightChart({ data, height = 140 }: { data: Point[]; height?: number }) {
  if (data.length < 2) {
    return (
      <View style={[styles.wrap, { height }]}>
        <Text style={styles.emptyText}>Cần ít nhất 2 lần cân để hiển thị biểu đồ</Text>
      </View>
    );
  }

  const width = 300;
  const padding = 16;
  const weights = data.map((d) => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.weight - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="weightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color.primary} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={color.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#weightGrad)" />
        <Path d={linePath} stroke={color.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4.5 : 0} fill={color.primary} />
        ))}
      </Svg>
      <View style={styles.labelRow}>
        <Text style={styles.axisLabel}>{min.toFixed(1)}kg</Text>
        <Text style={styles.axisLabel}>{max.toFixed(1)}kg</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  emptyText: { fontFamily: font.body, fontSize: 12.5, color: color.inkFaint, textAlign: "center", alignSelf: "center", marginTop: 40 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisLabel: { fontFamily: font.body, fontSize: 11, color: color.inkFaint },
});
