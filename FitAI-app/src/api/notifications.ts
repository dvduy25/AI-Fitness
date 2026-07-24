import { api } from "./client";

export type NotificationType = "like" | "comment" | "save_plan" | "new_post" | "share_post";

export interface AppNotification {
  _id: string;
  userId: string;
  senderId: { _id: string; name: string; avatar?: string; isVerified?: boolean };
  type: NotificationType;
  postId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: () => api.get<{ success: boolean; notifications: AppNotification[] }>("/posts/notifications").then((r) => r.data.notifications),

  unreadCount: () =>
    api.get<{ success: boolean; unreadCount: number }>("/posts/notifications/unread-count").then((r) => r.data.unreadCount),

  markRead: (notiId: string) => api.patch<{ success: boolean }>(`/posts/notifications/${notiId}/read`).then((r) => r.data),

  markAllRead: () => api.patch<{ success: boolean }>("/posts/notifications/read-all").then((r) => r.data),

  remove: (notiId: string) => api.delete<{ success: boolean }>(`/posts/notifications/${notiId}`).then((r) => r.data),
};
