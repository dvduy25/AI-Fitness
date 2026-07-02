import axios, { AxiosError } from "axios";
import { storage } from "@/utils/storage";
import { DEFAULT_API_URL, STORAGE_KEYS } from "@/constants/config";

export const api = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
});

let cachedBaseUrl: string | null = null;

export async function initApiClient() {
  try {
    const savedUrl = await storage.getItem(STORAGE_KEYS.apiUrl);
    if (savedUrl) {
      cachedBaseUrl = savedUrl;
      api.defaults.baseURL = savedUrl;
    }
  } catch {
    // ignore — fall back to default
  }
}

export async function setApiBaseUrl(url: string) {
  const clean = url.trim().replace(/\/$/, "");
  cachedBaseUrl = clean;
  api.defaults.baseURL = clean;
  await storage.setItem(STORAGE_KEYS.apiUrl, clean);
}

export function getApiBaseUrl() {
  return cachedBaseUrl || api.defaults.baseURL || DEFAULT_API_URL;
}

api.interceptors.request.use(async (config) => {
  const token = await storage.getItem(STORAGE_KEYS.token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Extracts a readable Vietnamese-language message from any API error shape. */
export function apiErrorMessage(error: unknown, fallback = "Đã có lỗi xảy ra. Vui lòng thử lại."): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string }>;
    if (err.response?.data?.message) return err.response.data.message;
    if (err.code === "ECONNABORTED") return "Kết nối tới máy chủ quá lâu. Kiểm tra lại mạng nhé.";
    if (!err.response) return "Không thể kết nối tới máy chủ. Kiểm tra địa chỉ server trong Hồ sơ.";
  }
  return fallback;
}
