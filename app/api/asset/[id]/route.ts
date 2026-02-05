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
    Authorization: `Bearer ${token}`,
    "x-api-token": token,
  } as Record<string, string>;
}

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const url = joinUrl(getEnv("ASSET_API_URL"), encodeURIComponent(id));
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
      method: "PUT",
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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const url = joinUrl(getEnv("ASSET_API_URL"), encodeURIComponent(id));
    const bodyText = await req.text();

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        ...authHeaders(),
        "content-type": "application/json",
        Accept: "application/json",
      },
      body: bodyText,
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

