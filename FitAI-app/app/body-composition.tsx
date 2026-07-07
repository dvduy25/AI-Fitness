import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Badge, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Body3DModel } from "@/components/body3d/Body3DModel";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { storage } from "@/utils/storage";
import { computeNavyResult, shapeParamsFromResult, type NavyResult } from "@/utils/bodyComposition";
import { color, font, radius, type } from "@/theme/tokens";

const HISTORY_KEY = "fitai_body_composition_history";

interface HistoryEntry {
  date: string;
  bodyFatPercent: number;
  category: string;
}

export default function BodyCompositionScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const gender = user?.gender === "female" ? "female" : "male";

  const [neck, setNeck] = useState("");
  const [waistInput, setWaistInput] = useState("");
  const [hip, setHip] = useState("");
  const [result, setResult] = useState<NavyResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(HISTORY_KEY);
        if (raw) setHistory(JSON.parse(raw));
      } catch {
        // bỏ qua nếu chưa có dữ liệu
      }
    })();
  }, []);

  const calculate = async () => {
    const heightCm = user?.height;
    const weightKg = user?.weight;
    if (!heightCm) {
      toast.show("Cập nhật chiều cao trong Hồ sơ trước khi đo.", "info");
      return;
    }
    const neckCm = Number(neck);
    const waistCm = Number(waistInput);
    const hipCm = gender === "female" ? Number(hip) : undefined;

    if (!neckCm || !waistCm || (gender === "female" && !hipCm)) {
      toast.show("Vui lòng nhập đầy đủ số đo (cm).", "info");
      return;
    }

    const res = computeNavyResult({ gender, heightCm, neckCm, waistCm, hipCm, weightKg });
    if (!res) {
      toast.show("Số đo chưa hợp lý (vòng eo cần lớn hơn vòng cổ). Vui lòng kiểm tra lại.", "error");
      return;
    }
    setResult(res);

    const entry: HistoryEntry = { date: new Date().toISOString(), bodyFatPercent: res.bodyFatPercent, category: res.category };
    const newHistory = [entry, ...history].slice(0, 10);
    setHistory(newHistory);
    try {
      await storage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch {
      // không chặn UI nếu lưu lịch sử thất bại
    }
  };

  const shape = result ? shapeParamsFromResult(result, gender) : null;

  return (
    <Screen contentStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.title}>Phân tích tỷ lệ cơ thể</Text>
      </View>
      <Text style={styles.subtitle}>
        Ước tính tỷ lệ mỡ & cơ theo <Text style={{ fontFamily: font.bodySemi, color: color.ink }}>US Navy Method</Text> — công
        thức được nhiều huấn luyện viên khuyên dùng vì không cần máy đo chuyên dụng.
      </Text>

      {result && shape ? (
        <Card style={{ alignItems: "center", paddingVertical: 10, marginBottom: 16 }}>
          <Body3DModel gender={gender} waist={shape.waist} muscle={shape.muscle} height={340} />
          <Text style={styles.modelHint}>Chạm & kéo để xoay mô hình</Text>
        </Card>
      ) : null}

      {result ? (
        <Card style={{ marginBottom: 16 }}>
          <View style={styles.resultTop}>
            <View>
              <Text style={styles.bfValue}>{result.bodyFatPercent}%</Text>
              <Text style={styles.bfLabel}>Tỷ lệ mỡ cơ thể</Text>
            </View>
            <Badge label={result.category} tone={result.categoryTone} />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{result.leanMassKg != null ? `${result.leanMassKg} kg` : "—"}</Text>
              <Text style={styles.statLabel}>Khối nạc (cơ + xương...)</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{result.fatMassKg != null ? `${result.fatMassKg} kg` : "—"}</Text>
              <Text style={styles.statLabel}>Khối lượng mỡ</Text>
            </View>
          </View>
          <View style={styles.muscleTag}>
            <Ionicons name="fitness-outline" size={14} color={color.primaryDark} />
            <Text style={styles.muscleTagText}>{result.muscleTierLabel}</Text>
          </View>
          <Text style={styles.disclaimer}>
            * Đây là ước tính minh hoạ dựa trên số đo vòng cơ thể, sai số ~3-4% so với máy đo DEXA/InBody chuyên dụng. Không
            dùng để chẩn đoán y tế.
          </Text>
        </Card>
      ) : null}

      <SectionHeader title="Nhập số đo cơ thể" subtitle="Đo sát da, không co bụng, đơn vị cm" />
      <Card style={{ marginBottom: 16 }}>
        <Input label="Vòng cổ (cm)" placeholder="VD: 38" keyboardType="numeric" value={neck} onChangeText={setNeck} />
        <Input label="Vòng eo (cm)" placeholder="VD: 82" keyboardType="numeric" value={waistInput} onChangeText={setWaistInput} />
        {gender === "female" ? (
          <Input label="Vòng hông (cm)" placeholder="VD: 95" keyboardType="numeric" value={hip} onChangeText={setHip} />
        ) : null}
        <Button label="Tính toán & dựng mô hình" onPress={calculate} icon={<Ionicons name="body-outline" size={17} color="#fff" />} />
      </Card>

      {history.length > 0 ? (
        <>
          <SectionHeader title="Lịch sử đo gần đây" />
          <Card>
            {history.map((h, i) => (
              <View key={h.date} style={[styles.historyRow, i > 0 && styles.historyRowBorder]}>
                <Text style={styles.historyDate}>{new Date(h.date).toLocaleDateString("vi-VN")}</Text>
                <Text style={styles.historyBf}>{h.bodyFatPercent}%</Text>
                <Text style={styles.historyCategory}>{h.category}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 4 },
  title: { ...type.h2, color: color.ink },
  subtitle: { ...type.bodySmall, color: color.inkFaint, marginBottom: 18, lineHeight: 18 },
  modelHint: { ...type.bodySmall, color: color.inkFaint, marginTop: 6 },
  resultTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bfValue: { ...type.display, color: color.ink },
  bfLabel: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  divider: { height: 1, backgroundColor: color.border, marginVertical: 14 },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  statCol: { flex: 1 },
  statValue: { ...type.h3, color: color.ink },
  statLabel: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  muscleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.primarySofter,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  muscleTagText: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.primaryDark },
  disclaimer: { ...type.bodySmall, color: color.inkFaint, lineHeight: 17 },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: color.border },
  historyDate: { ...type.bodySmall, color: color.inkFaint, flex: 1 },
  historyBf: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.ink, width: 46 },
  historyCategory: { ...type.bodySmall, color: color.inkSoft },
});
