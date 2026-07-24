import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card, Badge } from "@/components/ui/Card";
import { EmptyState, LoadingScreen } from "@/components/ui/Feedback";
import { useToast } from "@/context/ToastContext";
import { savesApi, type SavedItem } from "@/api/saves";
import { apiErrorMessage } from "@/api/client";
import { color, font, type } from "@/theme/tokens";

export default function LibraryScreen() {
  const toast = useToast();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await savesApi.getMySaves();
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
    }, [load])
  );

  if (loading) return <LoadingScreen label="Đang tải kho lưu trữ..." />;

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={color.ink} />
        </Pressable>
        <Text style={styles.title}>Kho lưu trữ của tôi</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(s) => s._id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <EmptyState
            icon="bookmark-outline"
            title="Chưa lưu lịch tập/ăn nào"
            description="Lưu lịch tập hoặc thực đơn của PT ở tab Cộng đồng để xem lại tại đây."
          />
        }
        renderItem={({ item }) => {
          const post = item.postId;
          const isDiet = post?.postType === "master_diet";
          return (
            <Card style={{ marginBottom: 12 }}>
              <View style={styles.rowTop}>
                <View style={styles.iconWrap}>
                  <Ionicons name={isDiet ? "nutrition-outline" : "barbell-outline"} size={18} color={color.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.name}>{post?.userId?.name || "PT"}</Text>
                  <Text style={styles.content} numberOfLines={2}>
                    {post?.content || (isDiet ? "Thực đơn mẫu" : "Lịch tập mẫu")}
                  </Text>
                </View>
                <Badge label={isDiet ? "Lịch ăn" : "Lịch tập"} tone={isDiet ? "secondary" : "primary"} />
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  title: { ...type.h2, color: color.ink },
  rowTop: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.primarySofter,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.ink },
  content: { ...type.bodySmall, color: color.inkFaint, marginTop: 2 },
});
