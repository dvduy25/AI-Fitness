import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Avatar, EmptyState, LoadingScreen } from "@/components/ui/Feedback";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/feed/PostCard";
import { SaveSheet } from "@/components/feed/SaveSheet";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { postsApi } from "@/api/posts";
import { ptApi } from "@/api/pt";
import { apiErrorMessage } from "@/api/client";
import { color, font, radius, type } from "@/theme/tokens";
import type { NearbyPT, Post } from "@/types";

type View_ = "feed" | "findpt";

export default function CommunityTab() {
  const { user } = useAuth();
  const [view, setView] = useState<View_>("feed");
  const canFindPT = user?.role === "user";

  return (
    <Screen scroll={false} padded={false} contentStyle={{ paddingBottom: 0 }}>
      <View style={styles.headerWrap}>
        <Text style={styles.header}>Cộng đồng</Text>
        {canFindPT ? (
          <View style={styles.segment}>
            <Pressable
              style={[styles.segmentBtn, view === "feed" && styles.segmentBtnActive]}
              onPress={() => setView("feed")}
            >
              <Text style={[styles.segmentText, view === "feed" && styles.segmentTextActive]}>Bảng tin</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentBtn, view === "findpt" && styles.segmentBtnActive]}
              onPress={() => setView("findpt")}
            >
              <Text style={[styles.segmentText, view === "findpt" && styles.segmentTextActive]}>Tìm PT</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {view === "feed" || !canFindPT ? <FeedView /> : <FindPTView />}
    </Screen>
  );
}

// ============================================================
// BẢNG TIN
// ============================================================
function FeedView() {
  const { user } = useAuth();
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saveTarget, setSaveTarget] = useState<Post | null>(null);
  const [commentTarget, setCommentTarget] = useState<Post | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await postsApi.getFeed();
      setPosts(list);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleLike = async (post: Post) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id === post._id
          ? {
              ...p,
              likes: p.likes.includes(user?._id || "")
                ? p.likes.filter((id) => id !== user?._id)
                : [...p.likes, user?._id || ""],
            }
          : p
      )
    );
    try {
      await postsApi.toggleLike(post._id);
    } catch {
      load();
    }
  };

  const handleHire = (post: Post) => {
    router.push(`/pt/${post.userId._id}` as any);
  };

  if (loading) return <LoadingScreen label="Đang tải bảng tin..." />;

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(p) => p._id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        ListEmptyComponent={
          <EmptyState
            icon="newspaper-outline"
            title="Chưa có bài viết nào"
            description="Các PT sẽ chia sẻ lịch tập & lịch ăn tại đây."
          />
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?._id}
            onLike={handleLike}
            onSave={setSaveTarget}
            onOpenComments={setCommentTarget}
            onHire={handleHire}
          />
        )}
      />
      <SaveSheet
        visible={!!saveTarget}
        post={saveTarget}
        onClose={() => setSaveTarget(null)}
        onSaved={(count) => {
          setPosts((prev) => prev.map((p) => (p._id === saveTarget?._id ? { ...p, savesCount: count } : p)));
        }}
      />
      <CommentsSheet
        visible={!!commentTarget}
        post={commentTarget}
        onClose={() => setCommentTarget(null)}
        onCommented={() => {
          setPosts((prev) =>
            prev.map((p) => (p._id === commentTarget?._id ? { ...p, commentsCount: p.commentsCount + 1 } : p))
          );
        }}
      />
    </>
  );
}

// ============================================================
// TÌM PT
// ============================================================
function FindPTView() {
  const toast = useToast();
  const [pts, setPts] = useState<NearbyPT[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await ptApi.getNearby();
      setPts(list);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = pts.filter((p) => p.ptId?.name?.toLowerCase().includes(query.toLowerCase()));

  if (loading) return <LoadingScreen label="Đang tìm PT gần bạn..." />;

  return (
    <FlatList
      data={filtered}
      keyExtractor={(p) => `${p.ptId?._id}-${p.date}`}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      ListHeaderComponent={
        <View style={{ marginBottom: 10 }}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={17} color={color.inkFaint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tên PT..."
              placeholderTextColor={color.inkFaint}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="people-outline"
          title="Chưa có PT nào đang rảnh hôm nay"
          description="Hãy quay lại sau hoặc kiểm tra ngày khác."
        />
      }
      renderItem={({ item }) => <PTCard pt={item} />}
    />
  );
}

function PTCard({ pt }: { pt: NearbyPT }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={styles.ptHeaderRow}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Avatar uri={pt.ptId?.avatar} name={pt.ptId?.name} size={48} />
          <View style={{ marginLeft: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.ptName}>{pt.ptId?.name}</Text>
              {pt.ptId?.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={color.primary} style={{ marginLeft: 4 }} />
              ) : null}
            </View>
            <Text style={styles.ptSub}>
              {pt.location || "Chưa cập nhật khu vực"}
              {pt.distance != null ? ` • ${pt.distance}km` : ""}
            </Text>
          </View>
        </View>
        <Badge label={`${pt.freeSlots.length} khung rảnh`} tone="secondary" />
      </View>

      {pt.freeSlots.length > 0 ? (
        <View style={styles.slotsRow}>
          {pt.freeSlots.slice(0, 4).map((s) => (
            <View key={s._id} style={styles.slotChip}>
              <Text style={styles.slotChipText}>
                {s.startTime} - {s.endTime}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.ptActionsRow}>
        <Button
          label="Xem hồ sơ & đặt lịch"
          variant="primary"
          size="sm"
          onPress={() => router.push(`/pt/${pt.ptId._id}` as any)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  header: { ...type.display, color: color.ink, marginBottom: 12 },
  segment: { flexDirection: "row", backgroundColor: color.surfaceSoft, borderRadius: radius.pill, padding: 3 },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.pill, alignItems: "center" },
  segmentBtnActive: { backgroundColor: color.surface, ...shadowSm() },
  segmentText: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.inkFaint },
  segmentTextActive: { color: color.ink },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontFamily: font.body, fontSize: 14.5, color: color.ink, height: "100%" },
  ptHeaderRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  ptName: { ...type.body, fontFamily: font.bodySemi, color: color.ink },
  ptSub: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
  slotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  slotChip: { backgroundColor: color.secondarySoft, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  slotChipText: { fontSize: 11, fontFamily: font.bodySemi, color: color.secondaryDark },
  ptActionsRow: { flexDirection: "row", gap: 8 },
});

function shadowSm() {
  return {
    shadowColor: "#3A2A1C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  } as const;
}
