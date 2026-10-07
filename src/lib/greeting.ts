/**
 * The Ask welcome line: a greeting that knows the time, the user's name, and — once it has
 * been earned — a nickname read from WHEN they work.
 *
 * Pure: no storage, no clock. The browser keeps the inputs (local-store.ts) and never sends
 * them anywhere; this module only turns them into words, so it is testable on Node.
 */

/** One question asked: the local day, hour and weekday. Nothing else is kept. */
export interface Activity {
  /** YYYY-MM-DD, local. */
  readonly d: string;
  /** 0–23, local. */
  readonly h: number;
  /** 0 = Sunday … 6 = Saturday. */
  readonly w: number;
}

export type Persona = "night-wolf" | "early-riser" | "weekend-warrior";

export const PERSONA_NAME: Record<Persona, string> = {
  "night-wolf": "Night Wolf",
  "early-riser": "Early Riser",
  "weekend-warrior": "Weekend Warrior",
};

/** How a nickname is earned — said in the menu, so it never feels like a secret score. */
export const PERSONA_REASON: Record<Persona, string> = {
  "night-wolf": "most of your questions come between 10 pm and 4 am",
  "early-riser": "most of your questions come between 5 and 8 am",
  "weekend-warrior": "most of your questions come on Saturdays and Sundays",
};

const MIN_QUESTIONS = 8;
const MIN_DAYS = 3;
const SHARE = 0.5;
/** Only the recent past counts, so a nickname can be lost as habits change. */
export const MAX_ACTIVITY = 120;

export function activityAt(now: Date): Activity {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { d: `${y}-${m}-${d}`, h: now.getHours(), w: now.getDay() };
}

const isNight = (h: number) => h >= 22 || h < 4;
const isEarly = (h: number) => h >= 5 && h < 8;
const isWeekend = (w: number) => w === 0 || w === 6;

/** The nickname this pattern has earned, or null. Night beats early beats weekend. */
export function persona(log: readonly Activity[]): Persona | null {
  const valid = log.filter(
    (a) => a && typeof a.d === "string" && Number.isInteger(a.h) && Number.isInteger(a.w),
  );
  if (valid.length < MIN_QUESTIONS) return null;
  if (new Set(valid.map((a) => a.d)).size < MIN_DAYS) return null;
  const share = (pred: (a: Activity) => boolean) => valid.filter(pred).length / valid.length;
  if (share((a) => isNight(a.h)) >= SHARE) return "night-wolf";
  if (share((a) => isEarly(a.h)) >= SHARE) return "early-riser";
  if (share((a) => isWeekend(a.w)) >= SHARE) return "weekend-warrior";
  return null;
}

function salutation(h: number): string {
  if (h >= 22 || h < 4) return "Burning the midnight oil";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

const QUESTIONS_DAY = ["What do you need to check?", "What’s on your mind?", "What are we looking into?"];
const QUESTIONS_NIGHT = ["What’s on your mind?", "What are we checking tonight?"];

/** A stable pick for the day, so the line does not change on every reload. */
function pick<T>(list: readonly T[], seed: string): T {
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return list[n % list.length];
}

/**
 * The welcome line. With a nickname: "Hey Night Wolf, what’s on your mind?". With a name:
 * "Evening, Nishant. What do you need to check?". With neither: the time and the question.
 */
export function greeting(input: { name: string | null; persona: Persona | null; now: Date }): {
  hello: string;
  question: string;
} {
  const { now } = input;
  const h = now.getHours();
  const day = activityAt(now).d;
  const late = isNight(h);
  const question = pick(late ? QUESTIONS_NIGHT : QUESTIONS_DAY, day);
  const name = cleanName(input.name);

  if (input.persona) {
    const nick = PERSONA_NAME[input.persona];
    return { hello: `Hey ${nick},`, question: lowerFirst(question) };
  }
  if (name) return { hello: `${salutation(h)}, ${name}.`, question };
  return { hello: `${salutation(h)}.`, question };
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** A name as typed: trimmed, letters/spaces/'.- only, at most 40 characters; else null. */
export function cleanName(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  return /^[\p{L}][\p{L}\p{M} .'’-]*$/u.test(s) ? s : null;
}
