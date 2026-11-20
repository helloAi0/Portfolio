/** Upload validation (pure): size limit and real content type from magic bytes, never the client's claim. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const SIGNATURES: Array<{ mime: string; ext: string; test: (b: Uint8Array) => boolean }> = [
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d },
  { mime: 'image/png', ext: 'png', test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/gif', ext: 'gif', test: (b) => b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];

export function safeFilename(name: string, ext: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '').replace(/\.[^.]*$/, '').replace(/^\.+/, '').replace(/[^A-Za-z0-9._ -]/g, '').trim().slice(0, 80) || 'file';
  return `${base}.${ext}`;
}

export function validateUpload(bytes: Uint8Array, originalName: string): { error: string } | { mime: string; filename: string } {
  if (bytes.length === 0) return { error: 'The file is empty.' };
  if (bytes.length > MAX_UPLOAD_BYTES) return { error: `The file is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  const sig = SIGNATURES.find((s) => s.test(bytes));
  if (!sig) return { error: 'Only PDF, PNG, JPG, GIF or WEBP files are accepted.' };
  return { mime: sig.mime, filename: safeFilename(originalName, sig.ext) };
}

export const FILE_URL_RE = /^\/api\/files\/([a-z0-9]{20,40})$/;
