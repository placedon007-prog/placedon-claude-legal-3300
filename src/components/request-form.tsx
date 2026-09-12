"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { formContent } from "@/lib/placedon-content/content/waitlist";
import type { FormFieldCopy } from "@/lib/placedon-content/content/types";
import { track } from "@/lib/track";
type Intent = "waitlist" | "pilot";

/**
 * Web3Forms access key — submissions are delivered to the operator's inbox
 * (placedon007@gmail.com) server-side, so they arrive regardless of the
 * visitor's device or mail app. The key is public by design (it lives in the
 * client form); it only authorises delivery to the configured inbox.
 */
const WEB3FORMS_ACCESS_KEY = "2fc8ec09-4cad-46fe-96ee-a67b244a616e";
export function RequestForm({
  initialIntent,
  enabled,
  noticeVersion,
  consentVersion,
}: {
  initialIntent: Intent;
  enabled: boolean;
  noticeVersion: string;
  consentVersion: string;
}) {
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const requestId = useRef<string | null>(null);
  const fingerprint = useRef("");
  const form = useRef<HTMLFormElement>(null);
  const started = useRef(false);
  const copy = formContent.purposes[intent];
  function markStart() {
    if (started.current) return;
    started.current = true;
    track("form_start", { intent });
  }
  function changeIntent(next: Intent) {
    if (pending) return;
    setIntent(next);
    setInvalid([]);
    setFeedback("");
    requestId.current = null;
    const box = form.current?.elements.namedItem(
      "requestConsent",
    ) as HTMLInputElement | null;
    if (box) box.checked = false;
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formEl = event.currentTarget;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    // No internal sink wired → deliver the request through Web3Forms, which
    // emails it to the operator server-side (reliable on any device). When a
    // reviewed internal sink is configured (`enabled`), the flow below runs.
    if (!enabled) {
      const data = new FormData(formEl);
      // Honeypot: a filled hidden field means a bot — accept silently, send nothing.
      if ((data.get("website") as string)?.length) {
        setSuccess(true);
        return;
      }
      setPending(true);
      setFeedback("");
      const label = intent === "pilot" ? "Pilot request" : "Register interest";
      const payload: Record<string, string> = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `Placedon — ${label}`,
        from_name: "Placedon website",
        request_type: label,
        email: String(data.get("email") ?? ""),
        name: String(data.get("name") ?? ""),
        organisation: String(data.get("organisation") ?? ""),
        role: String(data.get("role") ?? ""),
        product_updates:
          data.get("productUpdatesConsent") === "on" ? "yes" : "no",
      };
      if (intent === "pilot")
        payload.workflow = String(data.get("workflow") ?? "");
      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20000),
        });
        const result = await response.json();
        if (response.ok && result.success) {
          track("generate_lead", { intent });
          track("request_submitted", { intent });
          setSuccess(true);
        } else {
          setFeedback(formContent.errors.storageFailure.description);
        }
      } catch {
        setFeedback(formContent.errors.networkUncertain.description);
      } finally {
        setPending(false);
      }
      return;
    }

    setPending(true);
    setFeedback("");
    setInvalid([]);
    const data = new FormData(formEl);
    const payload = {
      ...Object.fromEntries(data),
      intent,
      requestConsent: data.get("requestConsent") === "on",
      productUpdatesConsent: data.get("productUpdatesConsent") === "on",
      noticeVersion,
      consentVersion,
    };
    const nextFingerprint = JSON.stringify(payload);
    if (!requestId.current || fingerprint.current !== nextFingerprint) {
      requestId.current = crypto.randomUUID();
      fingerprint.current = nextFingerprint;
    }
    const body = { ...payload, requestId: requestId.current };
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (
        response.ok &&
        result.stored === true &&
        result.requestId === requestId.current
      ) {
        setSuccess(true);
        if (result.emailStatus === "failed")
          setFeedback(formContent.successEmailFailed);
        else if (result.emailStatus !== "sent")
          setFeedback(formContent.successEmailPending);
      } else {
        const key = result.error as keyof typeof formContent.errors;
        setFeedback(
          formContent.errors[key]?.description ??
            formContent.errors.storageFailure.description,
        );
        if (Array.isArray(result.fields)) {
          const fields = result.fields.filter(
            (field: unknown): field is string => typeof field === "string",
          );
          setInvalid(fields);
          const first = form.current?.elements.namedItem(
            fields[0],
          ) as HTMLElement | null;
          requestAnimationFrame(() => first?.focus());
        }
      }
    } catch {
      setFeedback(formContent.errors.networkUncertain.description);
    } finally {
      setPending(false);
    }
  }
  if (success)
    return (
      <div className="request-form" role="status">
        <p className="eyebrow">Request received</p>
        <h2>{copy.success.title}</h2>
        <p>{copy.success.description}</p>
        {feedback && <p className="form-feedback">{feedback}</p>}
        <Link className="text-link" href={copy.success.action.href}>
          {copy.success.action.label}
        </Link>
      </div>
    );
  return (
    <form
      ref={form}
      className="request-form"
      onSubmit={submit}
      onFocusCapture={markStart}
      aria-label={formContent.formLabel}
    >
      <div className="intent-controls" aria-label="Request type">
        {(["waitlist", "pilot"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={intent === value}
            onClick={() => changeIntent(value)}
            disabled={pending}
          >
            {formContent.purposes[value].label}
          </button>
        ))}
      </div>
      <p className="small muted">{copy.description}</p>
      <fieldset
        disabled={pending}
        style={{ border: 0, padding: 0, margin: 0 }}
      >
        <legend className="sr-only">Contact details and consent</legend>
        {(copy.fields as readonly FormFieldCopy[]).map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>
              {field.label}
              <span>{field.required ? "Required" : "Optional"}</span>
            </label>
            {field.type === "select" ? (
              <select
                id={field.name}
                name={field.name}
                defaultValue=""
                aria-describedby={`${field.name}-help`}
                aria-invalid={invalid.includes(field.name)}
              >
                {field.options?.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                id={field.name}
                name={field.name}
                required={field.required}
                maxLength={field.maxLength}
                placeholder={field.example}
                rows={4}
                aria-describedby={`${field.name}-help`}
                aria-invalid={invalid.includes(field.name)}
              />
            ) : (
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                required={field.required}
                maxLength={field.maxLength}
                placeholder={field.example}
                autoComplete={field.autocomplete}
                aria-describedby={`${field.name}-help`}
                aria-invalid={invalid.includes(field.name)}
              />
            )}
            <p id={`${field.name}-help`} className="field-help">
              {field.help}
            </p>
            {invalid.includes(field.name) && (
              <p className="field-error">Review this field and try again.</p>
            )}
          </div>
        ))}
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">Leave this field empty</label>
          <input
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>
        <div className="checkbox-row">
          <input
            type="checkbox"
            id="requestConsent"
            name="requestConsent"
            required
          />
          <label htmlFor="requestConsent">{copy.consent.label}</label>
        </div>
        <div className="checkbox-row">
          <input
            type="checkbox"
            id="productUpdatesConsent"
            name="productUpdatesConsent"
          />
          <label htmlFor="productUpdatesConsent">
            {formContent.optionalUpdates.label}
          </label>
        </div>
      </fieldset>
      {feedback && (
        <div className="form-feedback" role="alert">
          {feedback}
        </div>
      )}
      <button
        className="button form-submit"
        type="submit"
        disabled={pending}
      >
        {pending ? copy.pendingLabel : copy.submitLabel}
      </button>
      <p className="form-smallprint">
        {formContent.submitNotice}
        <br />
        <Link href="/privacy">Privacy policy</Link> ·{" "}
        <Link href="/terms">Terms</Link>
      </p>
      <span className="sr-only" role="status">
        {pending ? formContent.progressAnnouncement : ""}
      </span>
    </form>
  );
}
