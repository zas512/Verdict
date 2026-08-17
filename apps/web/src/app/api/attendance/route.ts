import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/server-api";

export async function GET() {
  try {
    console.log("[WEB GET /api/attendance] Fetching attendance from backend");
    const res = await backendFetch("/attendance");
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errData.message || "Failed to fetch attendance records" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/attendance error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[WEB POST /api/attendance] Logging manual attendance", body);
    const res = await backendFetch("/attendance/manual", {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errData.message || "Failed to log manual attendance" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/attendance error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
