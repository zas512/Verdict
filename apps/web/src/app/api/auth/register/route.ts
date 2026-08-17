import { NextResponse } from "next/server";
import { decodeJwt, forwardBackendCookiesToResponse } from "@/lib/session";
import { backendFetch } from "@/lib/server-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await backendFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || "Failed to register" },
        { status: res.status }
      );
    }

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
    console.error("POST /api/auth/register error:", err);
    return NextResponse.json(
      { message: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
