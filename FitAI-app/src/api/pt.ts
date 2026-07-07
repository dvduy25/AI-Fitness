import { api } from "./client";
import type { HireRequest, NearbyPT, PTAvailabilityRecord } from "@/types";

export const ptApi = {
  // ── Tìm PT / xem lịch rảnh ──────────────────────────
  getNearby: (params?: { lat?: number; lng?: number; date?: string; radius?: number }) =>
    api
      .get<{ success: boolean; pts: NearbyPT[]; total: number }>("/pt/nearby", { params })
      .then((r) => r.data.pts),

  getAvailabilityForUser: (ptId: string, date?: string) =>
    api
      .get<{
        success: boolean;
        available: boolean;
        availabilityId?: string;
        date?: string;
        location?: string | null;
        pt?: { _id: string; name: string; avatar?: string; isVerified?: boolean };
        freeSlots: { _id: string; startTime: string; endTime: string }[];
      }>(`/pt/${ptId}/availability`, { params: date ? { date } : {} })
      .then((r) => r.data),

  // ── PT quản lý lịch rảnh của chính mình ─────────────
  getMyAvailability: (month?: string) =>
    api
      .get<{ success: boolean; records: PTAvailabilityRecord[] }>("/pt/availability/my", {
        params: month ? { month } : {},
      })
      .then((r) => r.data.records),

  setAvailability: (payload: {
    date: string;
    slots: { startTime: string; endTime: string }[];
    isAvailable?: boolean;
    location?: string;
    coordinates?: { lat: number; lng: number };
  }) =>
    api
      .post<{ success: boolean; message: string; availability: PTAvailabilityRecord }>("/pt/availability", payload)
      .then((r) => r.data),

  deleteAvailability: (date: string) =>
    api.delete<{ success: boolean; message: string }>(`/pt/availability/${date}`).then((r) => r.data),

  // ── Đặt lịch thuê PT ─────────────────────────────────
  createHireRequest: (payload: {
    ptId: string;
    availabilityId: string;
    slotId: string;
    goal?: string;
    price: number;
  }) => api.post<{ success: boolean; message: string; hireRequest: HireRequest }>("/pt/hire", payload).then((r) => r.data),

  getMyRequests: (status?: string) =>
    api
      .get<{ success: boolean; requests: HireRequest[] }>("/pt/hire/my-requests", {
        params: status ? { status } : {},
      })
      .then((r) => r.data.requests),

  getIncomingRequests: (status?: string) =>
    api
      .get<{ success: boolean; requests: HireRequest[] }>("/pt/hire/incoming", {
        params: status ? { status } : {},
      })
      .then((r) => r.data.requests),

  confirmRequest: (requestId: string) =>
    api.patch<{ success: boolean; message: string; request: HireRequest }>(`/pt/hire/${requestId}/confirm`).then((r) => r.data),

  rejectRequest: (requestId: string, reason?: string) =>
    api
      .patch<{ success: boolean; message: string; request: HireRequest }>(`/pt/hire/${requestId}/reject`, { reason })
      .then((r) => r.data),

  completeRequest: (requestId: string) =>
    api.patch<{ success: boolean; message: string; request: HireRequest }>(`/pt/hire/${requestId}/complete`).then((r) => r.data),

  cancelRequest: (requestId: string) =>
    api.patch<{ success: boolean; message: string; request: HireRequest }>(`/pt/hire/${requestId}/cancel`).then((r) => r.data),

  reviewPT: (requestId: string, rating: number, review?: string) =>
    api
      .post<{ success: boolean; message: string }>(`/pt/hire/${requestId}/review`, { rating, review })
      .then((r) => r.data),
};
