import axios from "axios";

let inMemoryToken: string | null = null;

/**
 * Set token in memory & optionally cookie for client requests
 */
export function setAccessToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== "undefined" && token) {
    console.log(
      "[Centralized TokenHandler] 🔑 Token set in Axios handler:",
      token.slice(0, 15) + "..."
    );
  }
}

/**
 * Get current in-memory token
 */
export function getAccessToken(): string | null {
  return inMemoryToken;
}

/**
 * Clear in-memory token
 */
export function clearTokens() {
  inMemoryToken = null;
  if (typeof window !== "undefined") {
    console.log(
      "[Centralized TokenHandler] 🧹 Tokens cleared from Axios handler"
    );
  }
}

/**
 * Centralized Axios Instance
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  withCredentials: true
});

/**
 * Request Interceptor: Automatically attaches bearer token & credentials to every outgoing request
 */
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.withCredentials = true;
    console.log(
      `[Centralized Axios] 🚀 ${config.method?.toUpperCase()} ${config.url} (Bearer attached: ${Boolean(token)})`
    );
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Handles automatic token refreshing on 401 Unauthorized
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log(
        "[Centralized Axios] ⚠️ 401 Unauthorized encountered. Attempting automatic token refresh..."
      );
      try {
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.accessToken;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          console.log(
            "[Centralized Axios] ✅ Token refresh successful. Retrying original request."
          );
          return api(originalRequest);
        }
      } catch (refreshErr) {
        console.error(
          "[Centralized Axios] ❌ Automatic token refresh failed. Clearing session.",
          refreshErr
        );
        clearTokens();
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);
