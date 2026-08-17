import { NextResponse } from "next/server";
import { decodeJwt, forwardBackendCookiesToResponse } from "@/lib/session";
import { backendFetch } from "@/lib/server-api";

/** Authenticated password change (first-login / profile). */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await backendFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to change password" },
        { status: res.status }
      );
    }

    // The backend re-mints tokens with mustChangePassword: false; forward the
    // Set-Cookie headers so the browser session clears the first-login gate.
    const initialResponse = NextResponse.json({ success: true });
    const { nextResponse, accessToken } = forwardBackendCookiesToResponse(
      res,
      initialResponse
    );
    const user = accessToken ? decodeJwt(accessToken) : null;

    return NextResponse.json(
      { success: true, user },
      {
        headers: nextResponse.headers
      }
    );
  } catch (err) {
    console.error("POST /api/auth/change-password error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
