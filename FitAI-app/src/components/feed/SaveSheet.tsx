import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, font, radius, space, type } from "@/theme/tokens";
import { useAuth } from "@/context/AuthContext";
import { savesApi } from "@/api/saves";
import { useToast } from "@/context/ToastContext";
import type { Post } from "@/types";

/**
 * Bottom-sheet cho thao tác "Lưu" một bài viết của PT.
 * Chỉ hiển thị số lượt lưu cho người dùng — không hiển thị bất kỳ thông tin
 * quy đổi thu nhập ($ / mốc tiền) của PT.
 */
export function SaveSheet({
  visible,
  post,
  onClose,
  onSaved,
}: {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onSaved: (newSavesCount: number) => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState<"ad" | "premium" | null>(null);
  const isPremium = !!user?.isPremium && (!user?.premiumUntil || new Date(user.premiumUntil) > new Date());

  if (!post) return null;

  const doSave = async (method: "ad" | "premium") => {
    if (method === "premium" && !isPremium) {
      toast.show("Bạn cần Premium để dùng lựa chọn này.", "info");
      return;
    }
    setBusy(method);
    try {
      // Với "ad": trong bản demo này ta coi như quảng cáo đã được xem xong
      // (tích hợp SDK quảng cáo thật sẽ gọi doSave sau khi quảng cáo kết thúc).
      const res = await savesApi.save(post._id, method);
      if (res.success) {
        toast.show("Đã lưu bài viết!", "success");
        onSaved(res.savesCount ?? post.savesCount + 1);
        onClose();
      } else if (res.alreadySaved) {
        toast.show("Bạn đã lưu bài viết này rồi.", "info");
        onClose();
      } else if (res.requiresUpgrade) {
        toast.show("Bạn cần Premium để lưu không giới hạn.", "info");
      } else {
        toast.show(res.message || "Không thể lưu bài viết.", "error");
      }
    } catch {
      toast.show("Đã có lỗi xảy ra. Vui lòng thử lại.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Lưu lịch này</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {post.postType === "master_diet" ? "Thực đơn" : "Lịch tập"} của {post.userId?.name}
          </Text>

          <View style={styles.optionsRow}>
            <Pressable
              style={[styles.option, styles.optionActive]}
              onPress={() => doSave("ad")}
              disabled={busy !== null}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: color.primarySofter }]}>
                {busy === "ad" ? (
                  <ActivityIndicator color={color.primary} />
                ) : (
                  <Ionicons name="play-circle-outline" size={20} color={color.primary} />
                )}
              </View>
              <Text style={styles.optionTitle}>Xem quảng cáo</Text>
              <Text style={styles.optionDesc}>30 giây • Lưu miễn phí</Text>
            </Pressable>

            <Pressable
              style={[styles.option, !isPremium && styles.optionDisabled]}
              onPress={() => doSave("premium")}
              disabled={busy !== null}
            >
              <View style={[styles.optionIconWrap, { backgroundColor: color.goldSoft }]}>
                {busy === "premium" ? (
                  <ActivityIndicator color="#8A5E12" />
                ) : (
                  <Ionicons name="ribbon-outline" size={20} color="#8A5E12" />
                )}
              </View>
              <Text style={styles.optionTitle}>Premium</Text>
              <Text style={styles.optionDesc}>{isPremium ? "Lưu không giới hạn" : "Cần nâng cấp"}</Text>
            </Pressable>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="bookmark-outline" size={14} color={color.inkSoft} />
            <Text style={styles.infoText}>
              {post.savesCount.toLocaleString("vi-VN")} lượt lưu cho lịch này
            </Text>
          </View>

          <Pressable style={styles.skipBtn} onPress={onClose}>
            <Text style={styles.skipText}>Bỏ qua</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,17,14,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xl,
    paddingBottom: 32,
  },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: color.border, alignSelf: "center", marginBottom: 16 },
  title: { ...type.h2, color: color.ink },
  subtitle: { ...type.bodySmall, color: color.inkFaint, marginTop: 2, marginBottom: 18 },
  optionsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  option: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  optionActive: { borderColor: color.primary },
  optionDisabled: { opacity: 0.55 },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  optionTitle: { ...type.body, fontFamily: font.bodySemi, color: color.ink, marginBottom: 2 },
  optionDesc: { ...type.bodySmall, color: color.inkFaint },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 14,
  },
  infoText: { ...type.bodySmall, color: color.inkSoft },
  skipBtn: { backgroundColor: color.surfaceSoft, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  skipText: { ...type.body, color: color.inkSoft },
});
