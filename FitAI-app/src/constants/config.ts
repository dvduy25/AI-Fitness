/**
 * Backend connection config.
 *
 * The Express API in /backend listens on PORT (default 5000) and is not
 * reachable at "localhost" from a physical phone or most emulators — that
 * hostname resolves to the phone itself. Set EXPO_PUBLIC_API_URL to your
 * computer's LAN IP (e.g. http://192.168.1.20:5000/api) in a `.env` file,
 * or change it later from Hồ sơ > Kết nối máy chủ inside the app.
 */
export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";

export const STORAGE_KEYS = {
  token: "fitai_token",
  user: "fitai_user",
  apiUrl: "fitai_api_url",
};
