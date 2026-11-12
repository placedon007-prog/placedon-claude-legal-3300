import { inflateRawSync } from "node:zlib";
import { EXPANSION_LIMIT_REASON, MAX_EXPANDED_BYTES } from "./limits";

/**
 * Just enough ZIP to read one member out of a .docx, with no dependency.
 *
 * A .docx IS a zip, and the only member that matters is `word/document.xml`. Adding a zip
 * library for that would be a dependency for one file read, and AGENTS.md asks for a
 * stated reason before any new one — this is the reason not to.
 *
 * Reads the END OF CENTRAL DIRECTORY record and walks the central directory, rather than
 * scanning for local file headers: a local header may carry zeroed sizes with the real
 * ones in a trailing data descriptor, and scanning for the signature can hit the same
 * bytes inside compressed data. The central directory is the authority.
 */

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const STORED = 0;
const DEFLATED = 8;

export class ZipError extends Error {}

function findEocd(buf: Buffer): number {
  // The EOCD sits at the end, after a comment of up to 65535 bytes.
  const min = Math.max(0, buf.length - 65_557);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD) return i;
  }
  throw new ZipError("not a zip: no end-of-central-directory record");
}

/** The named member's bytes, or null when the archive does not contain it. */
export function readZipMember(bytes: Uint8Array, wanted: string): Buffer | null {
  const buf = Buffer.from(bytes);
  const eocd = findEocd(buf);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== CENTRAL) {
      throw new ZipError("corrupt zip: central directory entry not found where declared");
    }
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const expandedSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");

    if (name === wanted) {
      if (expandedSize > MAX_EXPANDED_BYTES) throw new ZipError(EXPANSION_LIMIT_REASON);
      // The local header repeats the name and extra fields, at its own lengths.
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compressedSize);
      if (method === STORED) {
        if (raw.length > MAX_EXPANDED_BYTES) throw new ZipError(EXPANSION_LIMIT_REASON);
        return Buffer.from(raw);
      }
      if (method === DEFLATED) {
        try {
          // The central directory is supplied by the uploader. Enforce the actual
          // output budget inside zlib as well as checking its declared size.
          return inflateRawSync(raw, { maxOutputLength: MAX_EXPANDED_BYTES });
        } catch (cause) {
          if (cause instanceof Error && "code" in cause && cause.code === "ERR_BUFFER_TOO_LARGE") {
            throw new ZipError(EXPANSION_LIMIT_REASON);
          }
          throw new ZipError("the compressed document content could not be read");
        }
      }
      throw new ZipError(`unsupported compression method ${method} for ${wanted}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}
