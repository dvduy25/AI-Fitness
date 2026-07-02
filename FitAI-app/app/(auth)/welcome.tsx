import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Button } from "@/components/ui/Button";
import { color, font, gradient, type } from "@/theme/tokens";

const { width } = Dimensions.get("window");

function FlameMark({ size = 46 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2c.6 2.8-1.6 4.1-2.9 5.9C7.7 9.9 7 11.6 7 13.3 7 17.6 9.7 21 13 21c3.6 0 6-2.8 6-6.4 0-2.9-1.6-5-3-6.6.2 1.8-.6 2.8-1.5 3.5-.2-3.4-1.3-6-2.5-9.5Z"
        fill="#FFF"
      />
    </Svg>
  );
}

export default function Welcome() {
  return (
    <View style={styles.root}>
      <LinearGradient colors={gradient.flame} style={styles.hero}>
        <SafeAreaView style={styles.heroSafe}>
          <View style={styles.markRow}>
            <View style={styles.markBadge}>
              <FlameMark size={26} />
            </View>
            <Text style={styles.brand}>FitAI</Text>
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>Cháy hết mình{"\n"}mỗi ngày.</Text>
            <Text style={styles.heroSubtitle}>
              Lịch tập, thực đơn và huấn luyện viên AI theo sát bạn từng bữa ăn, từng buổi tập.
            </Text>
          </View>

          <View style={styles.orbitWrap}>
            <View style={[styles.orbit, styles.orbitLg]} />
            <View style={[styles.orbit, styles.orbitMd]} />
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>2,140</Text>
                <Text style={styles.statLabel}>kcal mục tiêu</Text>
              </View>
              <View style={[styles.statCard, styles.statCardAlt]}>
                <Text style={styles.statNum}>12</Text>
                <Text style={styles.statLabel}>ngày liên tiếp</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <Button label="Tạo tài khoản mới" onPress={() => router.push("/(auth)/register")} size="lg" />
        <Button
          label="Tôi đã có tài khoản"
          onPress={() => router.push("/(auth)/login")}
          variant="outline"
          size="lg"
          style={{ marginTop: 12 }}
        />
        <Text style={styles.serverLink} onPress={() => router.push("/(auth)/server-settings")}>
          Cấu hình địa chỉ máy chủ
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  hero: { height: "62%" },
  heroSafe: { flex: 1, paddingHorizontal: 24, paddingTop: 6 },
  markRow: { flexDirection: "row", alignItems: "center" },
  markBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  brand: { fontFamily: font.display, fontSize: 22, color: "#FFF" },
  heroBody: { marginTop: 30 },
  heroTitle: { fontFamily: font.display, fontSize: 40, lineHeight: 46, color: "#FFF", letterSpacing: -0.5 },
  heroSubtitle: { ...type.bodyLg, color: "rgba(255,249,242,0.85)", marginTop: 14, maxWidth: width * 0.82 },
  orbitWrap: { flex: 1, justifyContent: "flex-end", paddingBottom: 26 },
  orbit: { position: "absolute", borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  orbitLg: { width: 260, height: 260, right: -70, bottom: -40 },
  orbitMd: { width: 170, height: 170, right: -20, bottom: 10 },
  statRow: { flexDirection: "row" },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginRight: 10,
  },
  statCardAlt: { backgroundColor: "rgba(28,27,26,0.28)" },
  statNum: { fontFamily: font.displaySemi, fontSize: 20, color: "#FFF" },
  statLabel: { fontFamily: font.body, fontSize: 11.5, color: "rgba(255,249,242,0.85)", marginTop: 2 },
  sheet: {
    flex: 1,
    backgroundColor: color.bg,
    paddingHorizontal: 24,
    paddingTop: 26,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
  },
  serverLink: {
    ...type.bodySmall,
    color: color.inkFaint,
    textAlign: "center",
    marginTop: 18,
    textDecorationLine: "underline",
  },
});
