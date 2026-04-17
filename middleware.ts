import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.AUTH_SECRET;

  const token =
    secret != null && secret !== ""
      ? await getToken({
          req,
          secret,
          secureCookie: process.env.NODE_ENV === "production",
        })
      : null;

  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/invite/")
  ) {
    if (token?.sub && (pathname === "/login" || pathname.startsWith("/login/") || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/control")) {
    if (!token?.sub) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
    if (pathname.startsWith("/admin/users") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/control",
    "/control/:path*",
    "/login",
    "/login/:path*",
    "/signup",
    "/invite/:path*",
  ],
};
