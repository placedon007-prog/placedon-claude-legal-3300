import Link from "next/link";
import { formatProvisionReference } from "@/lib/format";

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
  const parts = formatProvisionReference(children).split(
    /(Companies Act, 2013|\b\d{4}-\d{2}-\d{2}\b|\bSections?\s+\d+(?:\([a-z0-9]+\))*|G\.S\.R\.\s*\d+\([A-Z]\)|₹[\d,]+)/g,
  );
  return (
    <>
      {parts.map((part, index) => {
        if (part === "Companies Act, 2013") return <em key={index}>{part}</em>;
        if (/^Sections?\s+\d/i.test(part)) {
          return <strong className="section-reference" key={index}>{part}</strong>;
        }
        if (/^(G\.S\.R\.|₹|\d{4}-\d{2}-\d{2})/.test(part)) {
          return <span className="record-reference" key={index}>{part}</span>;
        }
        return part;
      })}
    </>
  );
}
