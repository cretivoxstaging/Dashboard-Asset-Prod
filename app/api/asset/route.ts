import { NextResponse } from "next/server";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function authHeaders() {
  const token = process.env.ASSET_API_TOKEN;
  if (!token) return {};
  return {
    // different backends use different header conventions; harmless extras
    Authorization: `Bearer ${token}`,
    "x-api-token": token,
  } as Record<string, string>;
}

export async function GET() {
  try {
    const url = getEnv("ASSET_API_URL");
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...authHeaders(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const url = getEnv("ASSET_API_URL");
    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");
    const body = isMultipart ? await req.arrayBuffer() : await req.text();
    const headers: Record<string, string> = {
      ...authHeaders(),
      Accept: "application/json",
    };
    if (isMultipart) {
      headers["content-type"] = contentType;
    } else {
      headers["content-type"] = "application/json";
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

