import { prisma } from '@/lib/prisma';
import { FILE_URL_RE } from '@/lib/fileUpload';

/**
 * Uploaded files. Bytes go to the Cloudflare R2 bucket bound as `FILES` (key = StoredFile.id);
 * the database keeps only the metadata row. Without a bucket (plain Node), bytes fall back to the row itself.
 */
interface R2Like {
  put(key: string, value: ArrayBuffer | Uint8Array, opts?: unknown): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string | string[]): Promise<void>;
}

function bucket(): R2Like | undefined {
  return (globalThis as any)[Symbol.for('__cloudflare-context__')]?.env?.FILES;
}

export const hasBucket = () => !!bucket();

export async function saveUpload(bytes: Uint8Array, meta: { filename: string; mime: string }) {
  const r2 = bucket();
  const row = await prisma.storedFile.create({
    data: { filename: meta.filename, mimeType: meta.mime, size: bytes.length, data: r2 ? null : (bytes as any) },
  });
  if (r2) {
    try { await r2.put(row.id, bytes, { httpMetadata: { contentType: meta.mime } }); }
    catch (e) { await prisma.storedFile.delete({ where: { id: row.id } }).catch(() => undefined); throw e; }
  }
  return row;
}

export async function readUpload(row: { id: string; data: Uint8Array | null }): Promise<Uint8Array | null> {
  if (row.data) return new Uint8Array(row.data);
  const obj = await bucket()?.get(row.id);
  return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
}

/** Deletes the metadata row and the stored bytes. Safe to call for ids that no longer exist. */
export async function removeUpload(id: string): Promise<void> {
  await prisma.storedFile.deleteMany({ where: { id } });
  await bucket()?.delete(id).catch(() => undefined);
}

/** Removes the upload behind a "/api/files/<id>" URL, if the value is one. */
export async function removeUploadByUrl(url: string | null | undefined): Promise<void> {
  const m = url ? FILE_URL_RE.exec(url) : null;
  if (m) await removeUpload(m[1]);
}
