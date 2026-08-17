import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/server-api";

export async function GET() {
  try {
    console.log(
      "[WEB GET /api/associates] Calling backendFetch('/associates')"
    );
    const res = await backendFetch("/associates");
    console.log(
      "[WEB GET /api/associates] Backend response status:",
      res.status
    );
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("[WEB GET /api/associates] Error from backend:", errorData);
      return NextResponse.json(
        { message: errorData.message || "Failed to fetch associates" },
        { status: res.status }
      );
    }
    const data = await res.json();
    console.log(
      `[WEB GET /api/associates] Received ${data?.length} members from backend:`,
      data
    );
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/associates error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(
      "[WEB POST /api/associates] Creating associate with body:",
      body
    );
    const res = await backendFetch("/associates", {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("[WEB POST /api/associates] Backend error:", errorData);
      return NextResponse.json(
        { message: errorData.message || "Failed to create associate" },
        { status: res.status }
      );
    }

    const data = await res.json();
    console.log("[WEB POST /api/associates] Success response:", data);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/associates error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
