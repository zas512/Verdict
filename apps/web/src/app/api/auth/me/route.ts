import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/server-api";

export async function GET() {
  try {
    const res = await backendFetch("/auth/me");
    if (!res.ok) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const data = await res.json();
    return NextResponse.json({ user: data });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
