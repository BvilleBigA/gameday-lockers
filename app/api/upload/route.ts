import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

function getObjectStorageConfig() {
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT?.trim();
  const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim();
  const region = process.env.OBJECT_STORAGE_REGION?.trim() || "auto";
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = process.env.OBJECT_STORAGE_PUBLIC_BASE_URL?.trim();

  const ready = !!(endpoint && bucket && accessKeyId && secretAccessKey && publicBaseUrl);
  return {
    ready,
    endpoint,
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
  };
}

async function uploadToObjectStorage(fileName: string, contentType: string, body: Buffer): Promise<string> {
  const cfg = getObjectStorageConfig();
  if (!cfg.ready) {
    throw new Error("Object storage is not configured");
  }

  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId: cfg.accessKeyId!,
      secretAccessKey: cfg.secretAccessKey!,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket!,
      Key: `uploads/${fileName}`,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${cfg.publicBaseUrl!.replace(/\/$/, "")}/uploads/${fileName}`;
}

export async function POST(req: Request) {
  try {
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
    let url = "";
    const storage = getObjectStorageConfig();
    if (storage.ready) {
      url = await uploadToObjectStorage(name, file.type, buf);
    } else {
      const dir = path.join(process.cwd(), "public", "uploads");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), buf);
      url = `/uploads/${name}`;
    }

    return NextResponse.json({ url, mediaKind: meta.kind });
  } catch (error) {
    console.error("[upload]", error);
    return NextResponse.json(
      {
        error: "Upload failed. Configure object storage for production (R2/S3), or verify local uploads path is writable.",
      },
      { status: 500 }
    );
  }
}
