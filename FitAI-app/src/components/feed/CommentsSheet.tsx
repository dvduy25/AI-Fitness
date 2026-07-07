import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/ui/Feedback";
import { color, font, radius, space, type } from "@/theme/tokens";
import { postsApi } from "@/api/posts";
import { useToast } from "@/context/ToastContext";
import { apiErrorMessage } from "@/api/client";
import type { Post, PostComment } from "@/types";

export function CommentsSheet({ visible, post, onClose, onCommented }: {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onCommented: () => void;
}) {
  const toast = useToast();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    try {
      const list = await postsApi.getComments(post._id);
      setComments(list);
    } catch {
      // im lặng nếu lỗi tải bình luận
    } finally {
      setLoading(false);
    }
  }, [post]);

  useEffect(() => {
    if (visible) load();
    if (!visible) {
      setText("");
      setComments([]);
    }
  }, [visible, load]);

  const send = async () => {
    if (!post || !text.trim()) return;
    setSending(true);
    try {
      await postsApi.addComment(post._id, text.trim());
      setText("");
      onCommented();
      load();
    } catch (e) {
      toast.show(apiErrorMessage(e), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Bình luận</Text>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={color.primary} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c._id}
              style={{ maxHeight: 340 }}
              ListEmptyComponent={<Text style={styles.empty}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <Avatar uri={item.userId?.avatar} name={item.userId?.name} size={30} />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={styles.commentName}>{item.userId?.name}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                </View>
              )}
            />
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Viết bình luận..."
              placeholderTextColor={color.inkFaint}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable style={styles.sendBtn} onPress={send} disabled={sending || !text.trim()}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,17,14,0.45)", justifyContent: "flex-end" },
  backdropTap: { flex: 1 },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, paddingBottom: 24 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: color.border, alignSelf: "center", marginBottom: 12 },
  title: { ...type.h3, color: color.ink, marginBottom: 12 },
  empty: { ...type.bodySmall, color: color.inkFaint, textAlign: "center", paddingVertical: 24 },
  commentRow: { flexDirection: "row", marginBottom: 14 },
  commentName: { ...type.bodySmall, fontFamily: font.bodySemi, color: color.ink },
  commentText: { ...type.bodySmall, color: color.inkSoft, marginTop: 2 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 10, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: font.body,
    fontSize: 14,
    color: color.ink,
    maxHeight: 90,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
});
