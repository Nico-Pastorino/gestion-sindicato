import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { affiliateFiles, affiliates } from "@/lib/db/schema";
import { desc, eq, and, inArray } from "drizzle-orm";
import { logAudit } from "./audit.service";
import type { AffiliateFileKind } from "@/types";

// ─── Archivos por afiliado (guardados en Neon) ────────────────────────────────
// El binario vive en la columna data de affiliate_files y se sirve por
// /api/files/[id]. No requiere ningún storage externo. La foto de perfil
// además se refleja en affiliates.photo_url para mostrarla sin joins.

export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // límite del body en Vercel

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/** Listado sin la columna binaria (para no traer megabytes a las vistas). */
export async function listAffiliateFiles(affiliateId: string) {
  return db.query.affiliateFiles.findMany({
    where: eq(affiliateFiles.affiliateId, affiliateId),
    columns: { data: false },
    orderBy: [desc(affiliateFiles.createdAt)],
  });
}

export async function getAffiliateFileWithData(fileId: string) {
  return db.query.affiliateFiles.findFirst({
    where: eq(affiliateFiles.id, fileId),
  });
}

export async function uploadAffiliateFile(params: {
  affiliateId: string;
  kind: AffiliateFileKind;
  file: File;
  userId?: string;
}) {
  const { affiliateId, kind, file, userId } = params;

  if (file.size === 0) throw new Error("El archivo está vacío.");
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("El archivo supera el máximo de 4 MB.");
  }
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new Error("Formato no permitido. Subí una imagen (JPG, PNG, WebP) o un PDF.");
  }
  if (kind === "foto" && file.type === "application/pdf") {
    throw new Error("La foto de perfil debe ser una imagen (JPG, PNG o WebP).");
  }

  const affiliate = await db.query.affiliates.findFirst({ where: eq(affiliates.id, affiliateId) });
  if (!affiliate) throw new Error("Afiliado no encontrado");

  const id = randomUUID();
  const url = `/api/files/${id}`;
  const data = Buffer.from(await file.arrayBuffer());

  const [row] = await db
    .insert(affiliateFiles)
    .values({
      id,
      affiliateId,
      kind,
      url,
      pathname: `neon/${id}`,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      data,
      uploadedBy: userId ?? null,
    })
    .returning({
      id: affiliateFiles.id,
      affiliateId: affiliateFiles.affiliateId,
      kind: affiliateFiles.kind,
      url: affiliateFiles.url,
      fileName: affiliateFiles.fileName,
      contentType: affiliateFiles.contentType,
      sizeBytes: affiliateFiles.sizeBytes,
      createdAt: affiliateFiles.createdAt,
    });

  // La foto de perfil reemplaza a la anterior.
  if (kind === "foto") {
    const previous = await db.query.affiliateFiles.findMany({
      where: and(eq(affiliateFiles.affiliateId, affiliateId), eq(affiliateFiles.kind, "foto")),
      columns: { id: true },
    });
    const old = previous.filter((f) => f.id !== id);
    if (old.length > 0) {
      await db.delete(affiliateFiles).where(inArray(affiliateFiles.id, old.map((f) => f.id)));
    }
    await db.update(affiliates).set({ photoUrl: url }).where(eq(affiliates.id, affiliateId));
  }

  await logAudit({
    userId,
    action: "affiliate_file_uploaded",
    entityType: "affiliate",
    entityId: affiliateId,
    newValue: { kind, fileName: file.name, sizeBytes: file.size },
  });

  return row;
}

export async function deleteAffiliateFile(fileId: string, userId?: string) {
  const existing = await db.query.affiliateFiles.findFirst({
    where: eq(affiliateFiles.id, fileId),
    columns: { data: false },
  });
  if (!existing) throw new Error("Archivo no encontrado");

  await db.delete(affiliateFiles).where(eq(affiliateFiles.id, fileId));

  if (existing.kind === "foto") {
    await db
      .update(affiliates)
      .set({ photoUrl: null })
      .where(and(eq(affiliates.id, existing.affiliateId), eq(affiliates.photoUrl, existing.url)));
  }

  await logAudit({
    userId,
    action: "affiliate_file_deleted",
    entityType: "affiliate",
    entityId: existing.affiliateId,
    oldValue: { kind: existing.kind, fileName: existing.fileName },
  });
}
