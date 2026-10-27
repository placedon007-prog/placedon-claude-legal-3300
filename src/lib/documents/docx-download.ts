/** Helpers for serving a draft as a Word file. Pure, so they are unit-tested. */

/** A .docx is a ZIP: it must begin with the local-file-header signature "PK\x03\x04". */
export function isDocx(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/**
 * The Content-Disposition header for a download. The backend's filename is untrusted text:
 * the ASCII form drops quotes, backslashes and control characters, and the UTF-8 form is
 * percent-encoded, so neither can break out of the header.
 */
export function docxDownloadName(filename: string | undefined, version: number): string {
  const given = (filename ?? "").trim();
  const full = /\.docx$/i.test(given) ? given : `${given.replace(/\.[A-Za-z0-9]+$/, "") || "draft"}-v${version}.docx`;
  const ascii = Array.from(full).filter((ch) => {
    const code = ch.charCodeAt(0);
    return code >= 32 && code < 127 && ch !== '"' && ch !== "\\";
  }).join("") || "draft.docx";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(full)}`;
}

/** The filename a Content-Disposition header names, preferring the UTF-8 form. */
export function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      // fall through to the ASCII form
    }
  }
  const ascii = /filename="([^"]*)"/i.exec(header);
  return ascii?.[1] || fallback;
}
