import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/server-api";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    console.log("[WEB POST /api/attendance/check-in] Proxying check-in");
    const res = await backendFetch("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errData.message || "Failed to check in" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("POST /api/attendance/check-in error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
