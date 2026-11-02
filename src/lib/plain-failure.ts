/**
 * A failed call to Placedon, in the reader's words. The screen shows the sentence; the
 * kind, route and status go behind a "Details" toggle for whoever reports the problem.
 */
export interface FailureLike {
  readonly kind: string;
  readonly route?: string;
  readonly status?: number;
  readonly message?: string;
  readonly detail?: string;
}

export function plainFailure(error: FailureLike): string {
  if (error.status === 401) return "Your session has ended. Sign in again to continue.";
  if (error.status === 429 || error.status === 503) return "Placedon is busy right now. Try again in a minute.";
  switch (error.kind) {
    case "transport_error":
      return "Placedon could not be reached. Try again in a moment.";
    case "timeout":
      return "Placedon took too long to answer. Try again in a moment.";
    case "schema_mismatch":
      return "Placedon answered, but this page could not read the answer. Try again, or reload the page.";
    case "server_error":
      return "Something went wrong on Placedon's side. Try again in a moment.";
    case "not_found":
      return "Placedon could not find what this page asked for.";
    case "bad_request":
      return "Placedon could not accept this request. Check what you entered and try again.";
    default:
      return "Something went wrong. Try again in a moment.";
  }
}

export function failureDetails(error: FailureLike): string {
  return [error.kind, error.route, error.status ? `HTTP ${error.status}` : undefined, error.message, error.detail]
    .filter(Boolean)
    .join(" · ");
}
