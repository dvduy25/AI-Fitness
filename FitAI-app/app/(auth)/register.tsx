import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import type { Equipment, FitnessLevel, Goal, WorkoutLocation } from "@/types";
import { color, font, radius, type } from "@/theme/tokens";

const STEPS = ["Tài khoản", "Cơ thể", "Mục tiêu"];

const GOALS: { key: Goal; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "lose_weight", label: "Giảm cân", icon: "trending-down-outline" },
  { key: "gain_muscle", label: "Tăng cơ", icon: "barbell-outline" },
  { key: "maintain", label: "Duy trì vóc dáng", icon: "infinite-outline" },
];

const LEVELS: { key: FitnessLevel; label: string }[] = [
  { key: "beginner", label: "Mới bắt đầu" },
  { key: "intermediate", label: "Trung bình" },
  { key: "advanced", label: "Nâng cao" },
];

const LOCATIONS: { key: WorkoutLocation; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "home", label: "Tại nhà", icon: "home-outline" },
  { key: "gym", label: "Phòng gym", icon: "business-outline" },
];

const EQUIPMENT_OPTIONS: { key: Equipment; label: string }[] = [
  { key: "bodyweight", label: "Trọng lượng cơ thể" },
  { key: "dumbbells", label: "Tạ đơn" },
  { key: "pull_up_bar", label: "Xà đơn" },
  { key: "resistance_bands", label: "Dây kháng lực" },
  { key: "none", label: "Không có gì" },
];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const [goal, setGoal] = useState<Goal>("lose_weight");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("beginner");
  const [workoutLocation, setWorkoutLocation] = useState<WorkoutLocation>("home");
  const [equipment, setEquipment] = useState<Equipment[]>(["bodyweight"]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleEquipment = (key: Equipment) => {
    setEquipment((prev) => (prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]));
  };

  const validateStep = () => {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (name.trim().length < 2) next.name = "Tên phải có ít nhất 2 ký tự.";
      if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Email không đúng định dạng.";
      if (password.length < 6) next.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    } else if (step === 1) {
      const ageNum = Number(age);
      const heightNum = Number(height);
      const weightNum = Number(weight);
      if (!ageNum || ageNum < 10 || ageNum > 100) next.age = "Tuổi phải từ 10 đến 100.";
      if (!heightNum || heightNum < 100 || heightNum > 250) next.height = "Chiều cao không hợp lệ (cm).";
      if (!weightNum || weightNum < 20 || weightNum > 300) next.weight = "Cân nặng không hợp lệ (kg).";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };

  const submit = async () => {
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        age: Number(age),
        gender,
        height: Number(height),
        weight: Number(weight),
        goal,
        fitnessLevel,
        workoutLocation,
        availableEquipment: equipment,
      });
      router.replace("/(tabs)");
    } catch (e) {
      toast.show(apiErrorMessage(e, "Đăng ký thất bại."), "error");
    } finally {
      setLoading(false);
    }
  };

  const progress = useMemo(() => (step + 1) / STEPS.length, [step]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
            hitSlop={10}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={color.ink} />
          </Pressable>
          <Text style={styles.stepLabel}>
            Bước {step + 1}/{STEPS.length} · {STEPS[step]}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {step === 0 && (
          <View style={styles.stepBody}>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Input label="Họ và tên" value={name} onChangeText={setName} leftIcon="person-outline" error={errors.name} />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={errors.email}
            />
            <Input
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon="lock-closed-outline"
              error={errors.password}
              hint="Tối thiểu 6 ký tự"
            />
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepBody}>
            <Text style={styles.title}>Thông số cơ thể</Text>
            <Text style={styles.subtitle}>Giúp AI tính toán calo &amp; macro chuẩn xác cho bạn</Text>
            <View style={styles.genderRow}>
              <Chip label="Nam" selected={gender === "male"} onPress={() => setGender("male")} />
              <Chip label="Nữ" selected={gender === "female"} onPress={() => setGender("female")} />
            </View>
            <Input
              label="Tuổi"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              leftIcon="calendar-outline"
              error={errors.age}
            />
            <Input
              label="Chiều cao"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              leftIcon="resize-outline"
              suffix="cm"
              error={errors.height}
            />
            <Input
              label="Cân nặng"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              leftIcon="scale-outline"
              suffix="kg"
              error={errors.weight}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBody}>
            <Text style={styles.title}>Mục tiêu của bạn</Text>
            <Text style={styles.sectionLabel}>Bạn muốn</Text>
            <View style={styles.wrapRow}>
              {GOALS.map((g) => (
                <Chip key={g.key} label={g.label} selected={goal === g.key} onPress={() => setGoal(g.key)} />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Trình độ tập luyện</Text>
            <View style={styles.wrapRow}>
              {LEVELS.map((l) => (
                <Chip
                  key={l.key}
                  label={l.label}
                  selected={fitnessLevel === l.key}
                  onPress={() => setFitnessLevel(l.key)}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Nơi tập luyện</Text>
            <View style={styles.wrapRow}>
              {LOCATIONS.map((l) => (
                <Chip
                  key={l.key}
                  label={l.label}
                  selected={workoutLocation === l.key}
                  onPress={() => setWorkoutLocation(l.key)}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Dụng cụ sẵn có</Text>
            <View style={styles.wrapRow}>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <Chip
                  key={eq.key}
                  label={eq.label}
                  selected={equipment.includes(eq.key)}
                  onPress={() => toggleEquipment(eq.key)}
                />
              ))}
            </View>
          </View>
        )}

        <Button
          label={step === STEPS.length - 1 ? "Hoàn tất đăng ký" : "Tiếp tục"}
          onPress={goNext}
          loading={loading}
          style={{ marginTop: 12 }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 18 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepLabel: { ...type.label, color: color.inkFaint, textTransform: "uppercase" },
  progressTrack: { height: 5, backgroundColor: color.surfaceSoft, borderRadius: radius.pill, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: color.primary, borderRadius: radius.pill },
  stepBody: { marginTop: 26 },
  title: { ...type.h1, color: color.ink, marginBottom: 6 },
  subtitle: { ...type.body, color: color.inkFaint, marginBottom: 20 },
  genderRow: { flexDirection: "row", marginBottom: 4 },
  sectionLabel: { ...type.label, color: color.inkSoft, textTransform: "uppercase", marginTop: 18, marginBottom: 10 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap" },
});
