/** Expanded content has a separate budget from the compressed upload. */
export const MAX_EXPANDED_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_STREAMS = 1_000;

export const EXPANSION_LIMIT_REASON =
  "The document exceeds the 20 MB expanded-content limit. Split it into smaller documents.";
