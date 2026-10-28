/**
 * A file dropped where no drop zone handles it makes the browser open the file in the tab,
 * replacing the console and losing anything typed. These helpers are DOM-only, no React.
 */

/** True when the drag carries files (not text or a link being dragged inside the page). */
export function isFileDrag(event: { dataTransfer?: { types?: ArrayLike<string> } | null }): boolean {
  const types = event.dataTransfer?.types;
  return Boolean(types && Array.from(types).includes("Files"));
}

/**
 * Cancel the browser's default "open the dropped file" for every file drag on `target`.
 * Drop zones still receive their own events first; this only removes the navigation.
 * Returns the cleanup function.
 */
export function guardFileDrops(target: EventTarget): () => void {
  const cancel = (event: Event) => {
    if (isFileDrag(event as DragEvent)) event.preventDefault();
  };
  target.addEventListener("dragover", cancel);
  target.addEventListener("drop", cancel);
  return () => {
    target.removeEventListener("dragover", cancel);
    target.removeEventListener("drop", cancel);
  };
}
