import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/server-api";
import { AUTH_COOKIE_NAMES, clearAuthCookiesFromResponse } from "@/lib/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(
      AUTH_COOKIE_NAMES.REFRESH_TOKEN
    )?.value;
    if (refreshToken) {
      await backendFetch("/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`
        }
      }).catch((err) => console.error("Logout backend call failed:", err));
    }

    const response = NextResponse.json({ success: true });
    clearAuthCookiesFromResponse(response);

    cookieStore.delete(AUTH_COOKIE_NAMES.ACCESS_TOKEN);
    cookieStore.delete(AUTH_COOKIE_NAMES.REFRESH_TOKEN);

    return response;
  } catch (err) {
    console.error("Logout API route error:", err);
    return NextResponse.json(
      { message: "Internal server error during logout" },
      { status: 500 }
    );
  }
}
