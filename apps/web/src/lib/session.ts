import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export interface UserSession {
  sub: string;
  email: string;
  role: "SUPER_ADMIN" | "OWNER" | "ADMIN" | "ASSOCIATE";
  firmId: string | null;
  name: string | null;
  /** True until a provisioned password has been replaced (first login). */
  mustChangePassword?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token"
} as const;

export const ACCESS_TOKEN_MAX_AGE = 24 * 60 * 60; // 1 day
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}

/**
 * Centralized JWT decoder
 */
export function decodeJwt(token: string): UserSession | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replaceAll("-", "+").replaceAll("_", "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(
          (c) => "%" + ("00" + (c.codePointAt(0) ?? 0).toString(16)).slice(-2)
        )
        .join("")
    );
    const payload = JSON.parse(jsonPayload);

    // Check expiration if 'exp' claim is present
    if (payload && typeof payload.exp === "number") {
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        console.log(
          `[session:decodeJwt] ⚠️ Token has expired (exp: ${payload.exp}, current: ${currentTime})`
        );
        return null;
      }
    }

    return payload as UserSession;
  } catch {
    return null;
  }
}

/**
 * Refresh tokens from the NestJS backend
 */
function extractCookieValue(
  cookies: string[],
  cookieName: string
): string | null {
  const regex = new RegExp(`${cookieName}=([^;]+)`);

  for (const cookie of cookies) {
    if (!cookie.includes(`${cookieName}=`)) {
      continue;
    }

    const match = regex.exec(cookie);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export async function refreshAuthTokens(
  refreshToken: string
): Promise<AuthTokens | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      return null;
    }

    const cookies = res.headers.getSetCookie();

    const accessToken = extractCookieValue(
      cookies,
      AUTH_COOKIE_NAMES.ACCESS_TOKEN
    );

    const newRefreshToken = extractCookieValue(
      cookies,
      AUTH_COOKIE_NAMES.REFRESH_TOKEN
    );

    if (accessToken && newRefreshToken) {
      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    }

    const body = await res.json().catch(() => ({}));

    if (body.accessToken && body.refreshToken) {
      return {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken
      };
    }

    return null;
  } catch (err) {
    console.error("[TokenManager] Token refresh failed:", err);
    return null;
  }
}

/**
 * Centralized method to attach auth cookies to a NextResponse
 */
export function attachAuthCookiesToResponse(
  response: NextResponse,
  tokens: AuthTokens
): NextResponse {
  response.cookies.set(
    AUTH_COOKIE_NAMES.ACCESS_TOKEN,
    tokens.accessToken,
    getCookieOptions(ACCESS_TOKEN_MAX_AGE)
  );
  response.cookies.set(
    AUTH_COOKIE_NAMES.REFRESH_TOKEN,
    tokens.refreshToken,
    getCookieOptions(REFRESH_TOKEN_MAX_AGE)
  );
  return response;
}

/**
 * Forward raw Set-Cookie headers from backend response to NextResponse
 */
export function forwardBackendCookiesToResponse(
  backendResponse: Response,
  nextResponse: NextResponse
): { nextResponse: NextResponse; accessToken: string | null } {
  const setCookieHeaders = backendResponse.headers.getSetCookie();
  let accessToken: string | null = null;

  for (const cookieStr of setCookieHeaders) {
    nextResponse.headers.append("Set-Cookie", cookieStr);
    if (cookieStr.includes(`${AUTH_COOKIE_NAMES.ACCESS_TOKEN}=`)) {
      const match = new RegExp(
        `${AUTH_COOKIE_NAMES.ACCESS_TOKEN}=([^;]+)`
      ).exec(cookieStr);
      if (match) accessToken = match[1];
    }
  }

  return { nextResponse, accessToken };
}

/**
 * Centralized method to clear auth cookies from a NextResponse
 */
export function clearAuthCookiesFromResponse(
  response: NextResponse
): NextResponse {
  response.cookies.delete(AUTH_COOKIE_NAMES.ACCESS_TOKEN);
  response.cookies.delete(AUTH_COOKIE_NAMES.REFRESH_TOKEN);
  return response;
}

/**
 * Centralized Server Session Reader
 */
export async function getSession(): Promise<{
  user: UserSession | null;
  accessToken: string | null;
}> {
  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
  const refreshToken =
    cookieStore.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;

  if (accessToken) {
    const user = decodeJwt(accessToken);
    if (user) {
      return { user, accessToken };
    }
  }

  if (refreshToken) {
    const tokens = await refreshAuthTokens(refreshToken);
    if (tokens) {
      const newUser = decodeJwt(tokens.accessToken);
      if (newUser) {
        try {
          cookieStore.set(
            AUTH_COOKIE_NAMES.ACCESS_TOKEN,
            tokens.accessToken,
            getCookieOptions(ACCESS_TOKEN_MAX_AGE)
          );
          cookieStore.set(
            AUTH_COOKIE_NAMES.REFRESH_TOKEN,
            tokens.refreshToken,
            getCookieOptions(REFRESH_TOKEN_MAX_AGE)
          );
        } catch (err) {
          console.warn(
            "[session:getSession] ⚠️ Failed to set cookies in Server Component (expected during SSR page render):",
            err instanceof Error ? err.message : String(err)
          );
        }
        return { user: newUser, accessToken: tokens.accessToken };
      }
    }
  }

  return { user: null, accessToken: null };
}
