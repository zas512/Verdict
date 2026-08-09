import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAMES,
  decodeJwt,
  refreshAuthTokens,
  attachAuthCookiesToResponse
} from "@/lib/session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/associates",
  "/expenses",
  "/attendance",
  "/tasks",
  "/matters",
  "/clients",
  "/leave",
  "/platform"
];

const FIRM_SCOPED_PREFIXES = [
  "/dashboard",
  "/associates",
  "/expenses",
  "/attendance",
  "/tasks",
  "/matters",
  "/clients",
  "/leave"
];

function matchesAnyPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function redirectRoleAwareFromLogin(
  request: NextRequest,
  user: { role?: string } | null
) {
  const destination = user?.role === "SUPER_ADMIN" ? "/platform" : "/dashboard";
  return NextResponse.redirect(new URL(destination, request.url));
}

function redirectIfWrongArea(
  request: NextRequest,
  pathname: string,
  user: { role?: string } | null
) {
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  if (pathname.startsWith("/platform") && user && !isSuperAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (matchesAnyPrefix(pathname, FIRM_SCOPED_PREFIXES) && isSuperAdmin) {
    return NextResponse.redirect(new URL("/platform", request.url));
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let accessToken = request.cookies.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(
    AUTH_COOKIE_NAMES.REFRESH_TOKEN
  )?.value;
  let response = NextResponse.next();
  const isAccessTokenValid = accessToken
    ? Boolean(decodeJwt(accessToken))
    : false;
  if (!isAccessTokenValid && refreshToken) {
    const tokens = await refreshAuthTokens(refreshToken);
    if (tokens) {
      accessToken = tokens.accessToken;
      const requestHeaders = new Headers(request.headers);
      let cookieHeader = request.headers.get("cookie") || "";
      const updateCookie = (cookieStr: string, name: string, value: string) => {
        const parts = cookieStr
          .split(";")
          .map((p) => p.trim())
          .filter(Boolean);
        const filtered = parts.filter((p) => !p.startsWith(`${name}=`));
        filtered.push(`${name}=${value}`);
        return filtered.join("; ");
      };
      cookieHeader = updateCookie(
        cookieHeader,
        AUTH_COOKIE_NAMES.ACCESS_TOKEN,
        tokens.accessToken
      );
      cookieHeader = updateCookie(
        cookieHeader,
        AUTH_COOKIE_NAMES.REFRESH_TOKEN,
        tokens.refreshToken
      );
      requestHeaders.set("cookie", cookieHeader);
      response = NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });
      attachAuthCookiesToResponse(response, tokens);
    }
  }
  const hasToken = Boolean(accessToken || refreshToken);
  if (!hasToken && matchesAnyPrefix(pathname, PROTECTED_PREFIXES)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasToken) {
    const user = accessToken ? decodeJwt(accessToken) : null;
    if (pathname === "/login" || pathname === "/register") {
      return redirectRoleAwareFromLogin(request, user);
    }
    const areaRedirect = redirectIfWrongArea(request, pathname, user);
    if (areaRedirect) return areaRedirect;
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/associates/:path*",
    "/expenses/:path*",
    "/attendance/:path*",
    "/tasks/:path*",
    "/matters/:path*",
    "/clients/:path*",
    "/leave/:path*",
    "/platform/:path*",
    "/login",
    "/register"
  ]
};
