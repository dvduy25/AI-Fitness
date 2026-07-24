import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Avatar, EmptyState, LoadingScreen } from "@/components/ui/Feedback";
import { useToast } from "@/context/ToastContext";
import { notificationsApi, type AppNotification, type NotificationType } from "@/api/notifications";
import { apiErrorMessage } from "@/api/client";
import { color, font, radius, type } from "@/theme/tokens";

const TYPE_TEXT: Record<NotificationType, string> = {
  like: "đã thích bài viết của bạn",
  comment: "đã bình luận về bài viết của bạn",
  save_plan: "đã lưu lịch tập/ăn của bạn",
  new_post: "vừa đăng bài viết mới",
  share_post: "đã chia sẻ một bài viết cho bạn",
};
const TYPE_ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  like: "heart",
  comment: "chatbubble",
  save_plan: "bookmark",
  new_post: "newspaper",
  share_post: "share-social",
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function NotificationsScreen() {
  const toast = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await notificationsApi.list();
      setItems(list);
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      notificationsApi.markAllRead().catch(() => {});
    }, [load])
  );

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n._id !== id));
    try {
      await notificationsApi.remove(id);
    } catch {
      load();
    }
  };

  if (loading) return <LoadingScreen label="Đang tải thông báo..." />;

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.title}>Thông báo</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n._id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<EmptyState icon="notifications-outline" title="Chưa có thông báo nào" />}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, !item.isRead && styles.rowUnread]}
            onPress={() => item.postId && router.push("/(tabs)/community" as any)}
          >
            <Avatar uri={item.senderId?.avatar} name={item.senderId?.name} size={40} />
            <View style={styles.iconBadge}>
              <Ionicons name={TYPE_ICON[item.type]} size={11} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.text}>
                <Text style={styles.name}>{item.senderId?.name} </Text>
                {TYPE_TEXT[item.type]}
              </Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Pressable hitSlop={8} onPress={() => remove(item._id)}>
              <Ionicons name="close" size={16} color={color.inkFaint} />
            </Pressable>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  title: { ...type.h2, color: color.ink },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  rowUnread: { backgroundColor: color.primarySofter },
  iconBadge: {
    position: "absolute",
    left: 30,
    top: 26,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: color.surface,
  },
  text: { ...type.bodySmall, color: color.inkSoft, lineHeight: 18 },
  name: { fontFamily: font.bodySemi, color: color.ink },
  time: { ...type.bodySmall, color: color.inkFaint, marginTop: 2, fontSize: 11 },
});
