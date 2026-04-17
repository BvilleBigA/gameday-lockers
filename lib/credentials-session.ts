import { encode } from "@auth/core/jwt";
import type { User } from "@prisma/client";

const MAX_AGE_SEC = 30 * 24 * 60 * 60;

/** Full URL for cookie secure detection when `req.url` is relative. */
export function requestUrlForCookies(req: Request): string {
  if (req.url.startsWith("http://") || req.url.startsWith("https://")) {
    return req.url;
  }
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}${req.url}`;
}

/** Cookie name + options aligned with @auth/core defaultCookies (http vs https). */
export function sessionCookieParams(req: Request): {
  name: string;
  secure: boolean;
  maxAge: number;
} {
  const reqUrl = requestUrlForCookies(req);
  let useSecure = false;
  try {
    useSecure = new URL(reqUrl).protocol === "https:";
  } catch {
    useSecure = process.env.NODE_ENV === "production";
  }
  const name = useSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
  return { name, secure: useSecure, maxAge: MAX_AGE_SEC };
}

/**
 * Encrypted session JWT (same algorithm/salt rules as Auth.js credentials sign-in).
 * `sessionCookieName` must match the cookie name you set (incl. `__Secure-` prefix on HTTPS).
 */
export async function encodeCredentialsSessionToken(
  user: User,
  sessionCookieName: string
): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  const token = {
    name: user.name ?? undefined,
    email: user.email,
    picture: undefined as string | undefined,
    sub: user.id,
    id: user.id,
    role: user.role,
  };
  return encode({ token, secret, salt: sessionCookieName, maxAge: MAX_AGE_SEC });
}
