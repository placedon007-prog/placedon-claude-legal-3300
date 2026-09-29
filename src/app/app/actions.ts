"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getGateway } from "@/lib/gateway";
import { parseAnswer, type ParsedAnswer, type ReviewResponse } from "@/lib/gateway/types";
import type { AskResponse } from "@/lib/gateway/types";
import type { EngineError } from "@/lib/engine/errors";
import { endSession, passcodeAccepted, startSession } from "@/lib/auth/session";
import { rememberRun } from "@/lib/auth/recent-runs";

/**
 * Server Actions for `/app`.
 *
 * Everything that touches the gateway lives here. No client component imports
 * `@/lib/gateway` — the API key would be inlined into the public bundle, and
 * `server-guard` would throw at build rather than let it.
 *
 * Every action returns a discriminated state. **`failure` and `refusal` are different
 * branches on purpose**: a refusal is a product answer the pipeline decided on and carries
 * a code; a failure means the answer never arrived. Rendering the second in the abstain
 * register is the defect AGENTS.md names, so the types do not allow it.
 */

export type AskState =
  | { readonly phase: "idle" }
  | { readonly phase: "answered"; readonly data: AskResponse; readonly parsed: ParsedAnswer }
  | { readonly phase: "refused"; readonly data: AskResponse }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

const questionSchema = z
  .string()
  .trim()
  .min(8, "A question needs at least a few words.")
  .max(500, "Questions are capped at 500 characters.");

export async function askAction(
  _prev: AskState,
  formData: FormData,
): Promise<AskState> {
  const parsedInput = questionSchema.safeParse(formData.get("question"));
  if (!parsedInput.success) {
    return { phase: "invalid", message: parsedInput.error.issues[0].message };
  }
  const gateway = await getGateway();
  const result = await gateway.ask(parsedInput.data);
  if (!result.ok) return { phase: "failed", error: result.error };

  const data = result.data;
  if (data.run_id) {
    await rememberRun({
      id: data.run_id,
      intent: "research_question",
      at: new Date().toISOString(),
      label: parsedInput.data.slice(0, 80),
    });
  }
  if (data.status === "REFUSED" || data.status === "FAILED") {
    return { phase: "refused", data };
  }
  return { phase: "answered", data, parsed: parseAnswer(data.answer ?? "") };
}

export type ReviewState =
  | { readonly phase: "idle" }
  | { readonly phase: "reviewed"; readonly data: ReviewResponse }
  | { readonly phase: "failed"; readonly error: EngineError }
  | { readonly phase: "invalid"; readonly message: string };

const contractSchema = z
  .string()
  .trim()
  .min(40, "That is too short to be a contract. Paste the full text.")
  .max(60_000, "Contracts are capped at 60,000 characters in the prototype.");

export async function reviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const text = contractSchema.safeParse(formData.get("text"));
  if (!text.success) {
    return { phase: "invalid", message: text.error.issues[0].message };
  }
  // The checkbox is the operator ASSERTING this is test data. PLAN_22 D3 forbids a real
  // client contract while the deployment region is unconfirmed, and the backend refuses
  // one — this is the same statement made where a person can read it.
  if (formData.get("test_data") !== "on") {
    return {
      phase: "invalid",
      message:
        "Confirm this is a test document. The model is hosted in UAE North and no client contract may be sent there (PLAN_22 D3).",
    };
  }
  const name = String(formData.get("name") ?? "contract").slice(0, 80) || "contract";

  const gateway = await getGateway();
  const result = await gateway.reviewContract({ text: text.data, name, testData: true });
  if (!result.ok) return { phase: "failed", error: result.error };
  if (result.data.run_id) {
    await rememberRun({
      id: result.data.run_id,
      intent: "review_contract",
      at: new Date().toISOString(),
      label: name,
    });
  }
  return { phase: "reviewed", data: result.data };
}

export type LoginState = { readonly error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const submitted = String(formData.get("passcode") ?? "");
  if (!passcodeAccepted(submitted)) {
    // One message for a wrong passcode and for an empty one: telling them apart is the
    // first step of guessing.
    return { error: "That passcode was not accepted." };
  }
  await startSession();
  redirect("/app");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/app/login");
}
