"use server";

import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import type { Calendar } from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";

/**
 * `calendar.upcoming`, and nothing else.
 *
 * The screen's whole discipline is in the response, not here: an obligation the engine
 * cannot date arrives in `unknown[]` with `due: null` and the missing fact named, and the
 * console renders that as "unknown" plus the fact. Nothing in this file derives a date, and
 * nothing may: a deadline computed in the browser from a fact the engine refused to use is
 * exactly the fabricated figure AGENTS.md forbids.
 *
 * `failed` and the two data phases are separate branches. A gateway that cannot be reached
 * is not an obligation we could not date.
 */
export type CalendarState =
  | { readonly phase: "idle" }
  | { readonly phase: "loaded"; readonly data: Calendar }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

/** Only facts the engine asks for. An empty string is absent, never zero. */
const schema = z.object({
  company_class: z.enum(["private", "public", "opc", "section8"]),
  incorporation_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Incorporation date must be YYYY-MM-DD."),
  financial_year_end: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Financial year end must be YYYY-MM-DD.")
    .optional()
    .or(z.literal("")),
  as_of: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "As-of must be YYYY-MM-DD.")
    .optional()
    .or(z.literal("")),
});

export async function calendarAction(
  _prev: CalendarState,
  formData: FormData,
): Promise<CalendarState> {
  const parsed = schema.safeParse({
    company_class: formData.get("company_class"),
    incorporation_date: formData.get("incorporation_date"),
    financial_year_end: formData.get("financial_year_end") ?? "",
    as_of: formData.get("as_of") ?? "",
  });
  if (!parsed.success) {
    return { phase: "invalid", message: parsed.error.issues[0].message };
  }
  const { company_class, incorporation_date, financial_year_end, as_of } = parsed.data;

  const gateway = await getGateway();
  const result = await gateway.calendarUpcoming({
    company: { company_class, incorporation_date },
    // Sent ONLY when supplied. An absent anchor is what makes an obligation UNKNOWN, and
    // defaulting it here would manufacture the date the engine declined to give.
    ...(financial_year_end
      ? { anchors: { financial_year_end }, intervals: { "CA13-S96-AGM": "financial_year_end" } }
      : {}),
    ...(as_of ? { asOf: as_of } : {}),
  });
  if (!result.ok) return { phase: "failed", error: result.error };
  return { phase: "loaded", data: result.data };
}
