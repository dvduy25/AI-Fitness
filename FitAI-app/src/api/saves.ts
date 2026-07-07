import { api } from "./client";
import type { Post } from "@/types";

export interface SaveResult {
  success: boolean;
  message: string;
  savesCount?: number;
  alreadySaved?: boolean;
  requiresUpgrade?: boolean;
}

export interface SavedItem {
  _id: string;
  postId: Pick<Post, "_id" | "content" | "postType" | "workoutSnapshot" | "dietSnapshot" | "savesCount" | "userId">;
  createdAt: string;
}

// NOTE: Chủ ý KHÔNG expose các trường tiền ($ / totalDollarsEarned...) ra UI.
// App chỉ hiển thị số "lượt lưu" cho người dùng, không hiển thị quy đổi thu nhập.
export const savesApi = {
  save: async (postId: string, method: "ad" | "premium"): Promise<SaveResult> => {
    try {
      const r = await api.post<SaveResult>(`/saves/${postId}`, { method });
      return r.data;
    } catch (e: any) {
      if (e?.response?.data) return e.response.data as SaveResult;
      throw e;
    }
  },

  unsave: (postId: string) => api.delete<{ success: boolean; message: string }>(`/saves/${postId}`).then((r) => r.data),

  checkSaved: (postId: string) =>
    api.get<{ success: boolean; isSaved: boolean }>(`/saves/check/${postId}`).then((r) => r.data.isSaved),

  getMySaves: () =>
    api
      .get<{ success: boolean; saves: SavedItem[]; pagination: any }>("/saves/my")
      .then((r) => r.data.saves),

  /** PT: chỉ lấy phần "lượt lưu", bỏ qua hoàn toàn các trường quy đổi $ */
  getMySaveStats: () =>
    api
      .get<{
        success: boolean;
        earning: { totalSaves: number; savesToNextDollar: number; progressPercent: number };
        topPosts: { _id: string; count: number; post: { content: string; postType: string; savesCount: number } }[];
      }>("/saves/pt-earning")
      .then((r) => ({
        totalSaves: r.data.earning.totalSaves,
        topPosts: r.data.topPosts,
      })),
};
