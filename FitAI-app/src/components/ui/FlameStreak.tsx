import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { color, dayLabels, dayOrder, font, todayKey } from "@/theme/tokens";

function FlameIcon({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c.6 2.8-1.6 4.1-2.9 5.9C7.7 9.9 7 11.6 7 13.3 7 17.6 9.7 21 13 21c3.6 0 6-2.8 6-6.4 0-2.9-1.6-5-3-6.6.2 1.8-.6 2.8-1.5 3.5-.2-3.4-1.3-6-2.5-9.5Z"
        fill={filled ? color.primary : "none"}
        stroke={filled ? color.primary : color.borderStrong}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FlameStreak({
  completedDays,
  streak,
}: {
  /** dayOfWeek strings ("Monday"..."Sunday") completed this week */
  completedDays: string[];
  streak: number;
}) {
  const today = todayKey();
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Chuỗi ngày liên tiếp</Text>
        <View style={styles.streakPill}>
          <FlameIcon filled size={14} />
          <Text style={styles.streakText}>{streak} ngày</Text>
        </View>
      </View>
      <View style={styles.row}>
        {dayOrder.map((day) => {
          const done = completedDays.includes(day);
          const isToday = day === today;
          return (
            <View key={day} style={styles.dayCol}>
              <View
                style={[
                  styles.iconWrap,
                  done && styles.iconWrapDone,
                  isToday && !done && styles.iconWrapToday,
                ]}
              >
                <FlameIcon filled={done} size={16} />
              </View>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{dayLabels[day]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontFamily: font.bodySemi, fontSize: 13.5, color: color.onDark },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  streakText: { fontFamily: font.bodySemi, fontSize: 12, color: "#FFFFFF", marginLeft: 5 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center", width: 34 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  iconWrapDone: { backgroundColor: "rgba(255,255,255,0.92)" },
  iconWrapToday: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.65)" },
  dayLabel: { fontFamily: font.body, fontSize: 10.5, color: "rgba(255,249,242,0.6)" },
  dayLabelToday: { color: "#FFFFFF", fontFamily: font.bodySemi },
});
