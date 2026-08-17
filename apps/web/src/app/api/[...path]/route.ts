import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/server-api";

async function handleProxy(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const subPath = path.join("/");
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const endpoint = searchParams ? `${subPath}?${searchParams}` : subPath;

    const method = request.method;
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Avoid forwarding host or node-specific headers that might confuse NestJS
      if (
        !["host", "content-length", "connection"].includes(key.toLowerCase())
      ) {
        headers[key] = value;
      }
    });

    let body: string | Blob | undefined = undefined;
    if (method !== "GET" && method !== "HEAD") {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        body = JSON.stringify(await request.json());
      } else {
        try {
          body = await request.text();
        } catch (_) {
          body = undefined;
        }
      }
    }

    console.log(`[WEB PROXY ${method}] Proxying to backend: /${endpoint}`);
    const res = await backendFetch(endpoint, {
      method,
      headers,
      body
    });

    const resContentType = res.headers.get("content-type") || "";
    if (
      resContentType.includes("application/pdf") ||
      resContentType.includes("octet-stream")
    ) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: {
          "Content-Type": resContentType,
          "Content-Disposition": res.headers.get("content-disposition") || "",
          "Content-Length": res.headers.get("content-length") || ""
        }
      });
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(
        `[WEB PROXY ${method}] Backend error response for /${subPath}:`,
        data
      );
      return NextResponse.json(
        {
          message: data?.message || `Failed to perform ${method} on ${subPath}`
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`[WEB PROXY] Catch-all proxy error:`, err);
    const errMsg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ message: errMsg }, { status: 500 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
