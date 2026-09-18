import Link from "next/link";

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand${footer ? " brand-footer" : ""}`}
      aria-label="Placedon home"
    >
      <span className="brand-mark" aria-hidden="true" />
      <span>Placedon</span>
    </Link>
  );
}

export function LegalText({ children }: { children: string }) {
  const parts = children.split(
    /(Companies Act, 2013|\b\d{4}-\d{2}-\d{2}\b|\bs\.\d+(?:\([a-z0-9]+\))*|G\.S\.R\.\s*\d+\([A-Z]\)|₹[\d,]+)/g,
  );
  return (
    <>
      {parts.map((part, index) =>
        index % 2 ? (
          <span className="citation-text" key={index}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
