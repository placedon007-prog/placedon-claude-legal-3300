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

/**
 * Hand files dropped anywhere on `target` to `onFiles` when no drop zone handled them first
 * (a drop zone calls preventDefault). People drop a PDF on the conversation, not only on the
 * composer, and expect it to attach. `onHover` reports when a file drag is over the page.
 * Returns the cleanup function.
 */
export function catchStrayFileDrops(
  target: EventTarget,
  onFiles: (files: FileList) => void,
  onHover?: (over: boolean) => void,
): () => void {
  const over = (event: Event) => {
    if (!isFileDrag(event as DragEvent)) return;
    event.preventDefault();
    onHover?.(true);
  };
  const leave = (event: Event) => {
    if ((event as DragEvent).relatedTarget == null) onHover?.(false);
  };
  const drop = (event: Event) => {
    if (!isFileDrag(event as DragEvent)) return;
    onHover?.(false);
    if (event.defaultPrevented) return;
    event.preventDefault();
    const files = (event as DragEvent).dataTransfer?.files;
    if (files && files.length) onFiles(files);
  };
  target.addEventListener("dragover", over);
  target.addEventListener("dragleave", leave);
  target.addEventListener("drop", drop);
  return () => {
    target.removeEventListener("dragover", over);
    target.removeEventListener("dragleave", leave);
    target.removeEventListener("drop", drop);
  };
}
