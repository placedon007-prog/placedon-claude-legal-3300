"use client";

import { useMemo, useState } from "react";
import { LegalText } from "./brand";
import type { FaqEntry } from "@/lib/placedon-content/content/types";

type Category = { readonly value: string; readonly label: string };

/**
 * Category-filterable FAQ accordion.
 *
 * Native disclosure buttons (`aria-expanded` + `aria-controls`) so it is fully
 * keyboard-operable and announced by assistive tech. Panels stay in the DOM and
 * collapse via a `grid-template-rows: 0fr → 1fr` transition; the global
 * reduced-motion reset makes that snap instead of glide. Answers contain only
 * text, so a collapsed panel holds nothing focusable. Colour is never the only
 * signal — the chevron rotation and the expanded state carry it.
 */
export function FaqAccordion({
  entries,
  categories,
  labels,
}: {
  entries: readonly FaqEntry[];
  categories: readonly Category[];
  labels: {
    allCategories: string;
    expandAll: string;
    collapseAll: string;
    showAnswer: string;
    hideAnswer: string;
  };
}) {
  const [active, setActive] = useState<string>("all");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  // Only offer filter chips for categories that actually have entries.
  const present = useMemo(() => {
    const used = new Set<string>(entries.map((e) => e.category));
    return categories.filter((c) => used.has(c.value));
  }, [entries, categories]);

  const visible = useMemo(
    () => (active === "all" ? entries : entries.filter((e) => e.category === active)),
    [entries, active],
  );

  const allOpen = visible.length > 0 && visible.every((e) => open.has(e.id));

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setOpen(allOpen ? new Set() : new Set(visible.map((e) => e.id)));
  }

  return (
    <section className="container faq-wrap" aria-labelledby="faq-list-title" data-reveal-block>
      <div className="faq-controls">
        <h2 id="faq-list-title" className="sr-only">
          Frequently asked questions
        </h2>
        <div className="faq-filters" role="group" aria-label="Filter questions by topic">
          <button
            type="button"
            className="faq-chip"
            aria-pressed={active === "all"}
            onClick={() => setActive("all")}
          >
            {labels.allCategories}
          </button>
          {present.map((c) => (
            <button
              type="button"
              key={c.value}
              className="faq-chip"
              aria-pressed={active === c.value}
              onClick={() => setActive(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button type="button" className="faq-expand text-link" onClick={toggleAll}>
          {allOpen ? labels.collapseAll : labels.expandAll}
        </button>
      </div>

      <ul className="faq-list">
        {visible.map((entry) => {
          const isOpen = open.has(entry.id);
          const btnId = `faq-q-${entry.id}`;
          const panelId = `faq-a-${entry.id}`;
          return (
            <li className="faq-item" key={entry.id} data-open={isOpen ? "true" : "false"}>
              <h3 className="faq-q">
                <button
                  id={btnId}
                  type="button"
                  className="faq-q-btn"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(entry.id)}
                >
                  <span className="faq-q-text">{entry.question}</span>
                  <span className="faq-q-chevron" aria-hidden="true" />
                  <span className="sr-only">
                    {isOpen ? labels.hideAnswer : labels.showAnswer}
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                className="faq-a"
                aria-hidden={!isOpen}
              >
                <div className="faq-a-inner">
                  {entry.answer.map((para, i) => (
                    <p key={i}>
                      <LegalText>{para}</LegalText>
                    </p>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
