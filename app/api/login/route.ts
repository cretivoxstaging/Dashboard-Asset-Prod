import { NextResponse } from "next/server";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as LoginRequestBody;
    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan kata sandi wajib diisi." },
        { status: 400 },
      );
    }

    if (!EMAIL || !PASSWORD) {
      return NextResponse.json(
        { error: "Konfigurasi server tidak lengkap. Hubungi administrator." },
        { status: 500 },
      );
    }

    if (email !== EMAIL || password !== PASSWORD) {
      return NextResponse.json(
        { error: "Email atau kata sandi tidak valid." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: { email },
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

