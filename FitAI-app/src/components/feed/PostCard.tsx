import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Badge } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Feedback";
import { color, font, radius, space, type } from "@/theme/tokens";
import type { Post } from "@/types";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function PostCard({
  post,
  currentUserId,
  onLike,
  onSave,
  onOpenComments,
  onHire,
}: {
  post: Post;
  currentUserId?: string;
  onLike: (post: Post) => void;
  onSave: (post: Post) => void;
  onOpenComments: (post: Post) => void;
  onHire: (post: Post) => void;
}) {
  const isLiked = !!currentUserId && post.likes?.includes(currentUserId);
  const isOwnPost = post.userId?._id === currentUserId;
  const isTrainerAuthor = post.userId?.role === "trainer";
  const isPlanPost = post.postType === "master_workout" || post.postType === "master_diet";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.authorRow}
          onPress={() => isTrainerAuthor && router.push(`/pt/${post.userId._id}` as any)}
        >
          <Avatar uri={post.userId?.avatar} name={post.userId?.name} size={40} />
          <View style={{ marginLeft: 10 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{post.userId?.name}</Text>
              {post.userId?.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={color.primary} style={{ marginLeft: 4 }} />
              ) : null}
              {isTrainerAuthor ? (
                <View style={styles.ptTag}>
                  <Text style={styles.ptTagText}>PT</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.sub}>{timeAgo(post.createdAt)}</Text>
          </View>
        </Pressable>
        {isTrainerAuthor && !isOwnPost ? (
          <Pressable style={styles.hireBtn} onPress={() => onHire(post)}>
            <Text style={styles.hireBtnText}>Thuê PT</Text>
          </Pressable>
        ) : null}
      </View>

      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      {post.postType === "master_workout" && post.workoutSnapshot?.weeklySchedule ? (
        <WorkoutPreview schedule={post.workoutSnapshot.weeklySchedule} />
      ) : null}

      {post.postType === "master_diet" && post.dietSnapshot ? (
        <DietPreview dietSnapshot={post.dietSnapshot} />
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => onLike(post)}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={19}
              color={isLiked ? color.danger : color.inkFaint}
            />
            <Text style={styles.actionText}>{post.likes?.length ?? 0}</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onOpenComments(post)}>
            <Ionicons name="chatbubble-outline" size={17} color={color.inkFaint} />
            <Text style={styles.actionText}>{post.commentsCount ?? 0}</Text>
          </Pressable>
        </View>

        {isPlanPost ? (
          <View style={styles.saveGroup}>
            <View style={styles.saveCountBadge}>
              <Ionicons name="bookmark" size={11} color={color.primaryDark} />
              <Text style={styles.saveCountText}>{(post.savesCount ?? 0).toLocaleString("vi-VN")} lượt lưu</Text>
            </View>
            {!isOwnPost ? (
              <Pressable style={styles.saveBtn} onPress={() => onSave(post)}>
                <Ionicons name="bookmark-outline" size={14} color="#fff" />
                <Text style={styles.saveBtnText}>Lưu</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function WorkoutPreview({ schedule }: { schedule: NonNullable<Post["workoutSnapshot"]>["weeklySchedule"] }) {
  const activeDay = (schedule || []).find((d) => !d.isRestDay && d.exercises?.length);
  if (!activeDay) return null;
  const exNames = activeDay.exercises.map((e: any) => e.exerciseId?.name || "Bài tập").slice(0, 2);
  const more = activeDay.exercises.length - exNames.length;
  return (
    <View style={styles.previewBox}>
      <View style={styles.previewHeader}>
        <Ionicons name="barbell-outline" size={15} color={color.primary} />
        <Text style={styles.previewTitle}>
          {activeDay.title || activeDay.dayOfWeek} — {activeDay.exercises.length} bài tập
        </Text>
        <Badge label="Lịch tập" tone="primary" />
      </View>
      {exNames.map((n: string, i: number) => (
        <Text key={i} style={styles.previewLine}>
          • {n}
        </Text>
      ))}
      {more > 0 ? <Text style={styles.previewMore}>+{more} bài khác...</Text> : null}
    </View>
  );
}

function DietPreview({ dietSnapshot }: { dietSnapshot: NonNullable<Post["dietSnapshot"]> }) {
  const total = dietSnapshot.dailyTotal;
  return (
    <View style={styles.previewBox}>
      <View style={styles.previewHeader}>
        <Ionicons name="nutrition-outline" size={15} color={color.secondary} />
        <Text style={styles.previewTitle}>
          Thực đơn{total?.calories ? ` — ${Math.round(total.calories)} kcal/ngày` : ""}
        </Text>
        <Badge label="Lịch ăn" tone="secondary" />
      </View>
      {total ? (
        <View style={styles.macroGrid}>
          <Text style={styles.previewLine}>Đạm: {Math.round(total.protein)}g</Text>
          <Text style={styles.previewLine}>Tinh bột: {Math.round(total.carbs)}g</Text>
          <Text style={styles.previewLine}>Béo: {Math.round(total.fat)}g</Text>
          <Text style={[styles.previewLine, { color: color.primary }]}>
            {dietSnapshot.meals?.length ?? 0} bữa/ngày
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    marginBottom: space.sm,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  authorRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  name: { ...type.body, fontFamily: font.bodySemi, color: color.ink },
  ptTag: { backgroundColor: color.primarySoft, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 6 },
  ptTagText: { fontSize: 9.5, fontFamily: font.bodySemi, color: color.primaryDark },
  sub: { ...type.bodySmall, color: color.inkFaint, marginTop: 1 },
  hireBtn: { borderWidth: 1.5, borderColor: color.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  hireBtnText: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.primary },
  content: { ...type.body, color: color.inkSoft, lineHeight: 20, marginBottom: 10 },
  previewBox: { backgroundColor: color.surfaceSoft, borderRadius: radius.md, padding: 10, marginBottom: 10 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  previewTitle: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.ink, flex: 1 },
  previewLine: { ...type.bodySmall, color: color.inkSoft, marginTop: 2 },
  previewMore: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionsRow: { flexDirection: "row", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { ...type.bodySmall, color: color.inkFaint },
  saveGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  saveCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: color.goldSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  saveCountText: { fontSize: 11, fontFamily: font.bodySemi, color: "#8A5E12" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: color.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  saveBtnText: { fontSize: 12, fontFamily: font.bodySemi, color: "#fff" },
});
