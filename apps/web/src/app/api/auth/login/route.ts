import { NextResponse } from "next/server";
import { decodeJwt, forwardBackendCookiesToResponse } from "@/lib/session";
import { backendFetch } from "@/lib/server-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(
      `[Next.js API Route: /api/auth/login] 🔑 Received login request for: ${body.email}`
    );

    const res = await backendFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    });

    console.log(
      `[Next.js API Route: /api/auth/login] 📥 Backend response status: ${res.status}`
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.warn(
        `[Next.js API Route: /api/auth/login] ❌ Backend authentication failed:`,
        errorData
      );
      return NextResponse.json(
        { message: errorData.message || "Invalid credentials" },
        { status: res.status }
      );
    }

    const initialResponse = NextResponse.json({ success: true });
    const { nextResponse, accessToken } = forwardBackendCookiesToResponse(
      res,
      initialResponse
    );
    const user = accessToken ? decodeJwt(accessToken) : null;

    console.log(
      `[Next.js API Route: /api/auth/login] ✅ Cookies attached to client response via TokenManager. Decoded JWT user:`,
      user
    );

    return NextResponse.json(
      { success: true, user },
      {
        headers: nextResponse.headers
      }
    );
  } catch (err) {
    console.error(
      "[Next.js API Route: /api/auth/login] 💥 Error during login authentication:",
      err
    );
    return NextResponse.json(
      { message: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}
