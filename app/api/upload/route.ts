import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { isPlatformAdmin } from "@/lib/org-permissions";

const ALLOWED = new Map([
  ["image/jpeg", { ext: ".jpg", kind: "IMAGE" }],
  ["image/png", { ext: ".png", kind: "IMAGE" }],
  ["image/webp", { ext: ".webp", kind: "IMAGE" }],
  ["video/mp4", { ext: ".mp4", kind: "VIDEO" }],
  ["video/webm", { ext: ".webm", kind: "VIDEO" }],
]);

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  if (!isPlatformAdmin(auth.session.user.role)) {
    const can = await prisma.organizationMember.findFirst({
      where: {
        userId: auth.session.user.id,
        role: { in: ["OWNER", "COACH"] },
      },
    });
    if (!can) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const meta = ALLOWED.get(file.type);
  if (!meta) {
    return NextResponse.json(
      { error: "Use JPEG, PNG, WebP, MP4, or WebM" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 80 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 80MB)" }, { status: 400 });
  }

  const name = `${randomUUID()}${meta.ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);

  const url = `/uploads/${name}`;
  return NextResponse.json({ url, mediaKind: meta.kind });
}
