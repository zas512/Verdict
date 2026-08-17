import { cookies } from "next/headers";
import { refreshAuthTokens, getCookieOptions } from "./session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export function getBackendUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

export async function backendFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const targetUrl = getBackendUrl(endpoint);
  console.log(
    `[server-api:backendFetch] 🚀 ${options.method || "GET"} ${targetUrl} | Cookies -> access_token: ${accessToken ? "PRESENT" : "MISSING"}, refresh_token: ${refreshToken ? "PRESENT" : "MISSING"}`
  );

  let res = await fetch(targetUrl, {
    ...options,
    headers,
    cache: options.cache || "no-store"
  });

  // Intercept 401 Unauthorized responses to perform automatic token refreshing on the server side
  if (res.status === 401 && refreshToken) {
    console.log(
      "[server-api:backendFetch] ⚠️ 401 Unauthorized from backend. Attempting to refresh tokens..."
    );
    const tokens = await refreshAuthTokens(refreshToken);
    if (tokens) {
      console.log(
        "[server-api:backendFetch] ✅ Tokens refreshed successfully. Retrying request..."
      );
      try {
        cookieStore.set(
          "access_token",
          tokens.accessToken,
          getCookieOptions(24 * 60 * 60)
        );
        cookieStore.set(
          "refresh_token",
          tokens.refreshToken,
          getCookieOptions(7 * 24 * 60 * 60)
        );
      } catch (cookieErr) {
        console.warn(
          "[server-api:backendFetch] ⚠️ Failed to write cookies on response (expected in some contexts):",
          cookieErr
        );
      }

      // Re-create headers with the new token
      const retryHeaders = new Headers(options.headers);
      if (!retryHeaders.has("Content-Type") && options.body) {
        retryHeaders.set("Content-Type", "application/json");
      }
      retryHeaders.set("Authorization", `Bearer ${tokens.accessToken}`);

      // Retry the original request
      res = await fetch(targetUrl, {
        ...options,
        headers: retryHeaders,
        cache: options.cache || "no-store"
      });
    }
  }

  console.log(
    `[server-api:backendFetch] 📥 Status: ${res.status} for ${targetUrl}`
  );
  return res;
}
