import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/server-api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log(`[WEB PATCH /api/attendance/${id}] Proxying update`);
    const res = await backendFetch(`/attendance/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errData.message || "Failed to update attendance record" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(`PATCH /api/attendance/[id] error:`, err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[WEB DELETE /api/attendance/${id}] Proxying delete`);
    const res = await backendFetch(`/attendance/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: errData.message || "Failed to delete attendance record" },
        { status: res.status }
      );
    }
    const data = await res.json().catch(() => ({ success: true }));
    return NextResponse.json(data);
  } catch (err) {
    console.error(`DELETE /api/attendance/[id] error:`, err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
