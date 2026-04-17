import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { encodeCredentialsSessionToken, sessionCookieParams } from "@/lib/credentials-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const rt = body?.redirectTo;
    const redirectTo =
      typeof rt === "string" && rt.startsWith("/") && !rt.startsWith("//") ? rt : "/admin";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const { name, secure, maxAge } = sessionCookieParams(req);
    const token = await encodeCredentialsSessionToken(user, name);

    const res = NextResponse.json({ ok: true as const, redirectTo });
    res.cookies.set(name, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge,
    });
    return res;
  } catch (e) {
    console.error("[auth/login]", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        error:
          message.includes("AUTH_SECRET") || message.includes("secret")
            ? "Server missing AUTH_SECRET. Add it to .env (e.g. openssl rand -base64 32)."
            : "Sign-in failed. Check server logs or try again.",
      },
      { status: 500 }
    );
  }
}
