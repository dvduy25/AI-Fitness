import { api } from "./client";
import type { Post, PostComment } from "@/types";

export const postsApi = {
  /** Bảng tin cá nhân hoá (ưu tiên người đang follow) */
  getFeed: () => api.get<{ success: boolean; posts: Post[] }>("/posts/feed").then((r) => r.data.posts),

  /** Bài viết mới nhất, không cá nhân hoá */
  getLatest: () => api.get<{ success: boolean; posts: Post[] }>("/posts/latest").then((r) => r.data.posts),

  getById: (postId: string) =>
    api.get<{ success: boolean; post: Post }>(`/posts/${postId}`).then((r) => r.data.post),

  toggleLike: (postId: string) =>
    api
      .post<{ success: boolean; isLiked: boolean; likeCount: number }>(`/posts/${postId}/like`)
      .then((r) => r.data),

  getComments: (postId: string) =>
    api.get<{ success: boolean; comments: PostComment[] }>(`/posts/${postId}/comments`).then((r) => r.data.comments),

  addComment: (postId: string, content: string) =>
    api.post<{ success: boolean; comment: PostComment }>(`/posts/${postId}/comments`, { content }).then((r) => r.data),

  deleteComment: (commentId: string) =>
    api.delete<{ success: boolean }>(`/posts/comment/${commentId}`).then((r) => r.data),

  /** PT chia sẻ lịch tập / lịch ăn mẫu của chính mình lên bảng tin */
  shareMaster: (shareType: "workout" | "diet", content?: string) => {
    const form = new FormData();
    form.append("shareType", shareType);
    if (content) form.append("content", content);
    return api
      .post<{ success: boolean; post: Post; message?: string }>("/posts/share-master", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
