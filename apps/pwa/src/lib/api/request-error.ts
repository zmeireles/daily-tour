/**
 * Build an error that carries the server's explanation.
 *
 * catalog-svc answers a rejected write with `{ error, details }`, and throwing a
 * bare `create guesthouse 400` discarded all of it — a specific slug-validation
 * failure reached the owner as an opaque status with nothing to act on (#372).
 *
 * Lives here rather than in a feature folder because the places hooks need the
 * identical thing, and copying it would repeat exactly the mistake #392 was
 * filed for: two identical helper bodies in two feature folders, free to drift.
 *
 * `status` is preserved on the error so callers that branch on it (the optimistic
 * place PATCH rolls back differently on a 404) keep working.
 */
export async function requestError(
  res: Response,
  action: string,
): Promise<Error & { status: number }> {
  let detail = "";
  try {
    const body = (await res.json()) as { error?: string; details?: unknown };
    detail = [
      body.error,
      typeof body.details === "string"
        ? body.details
        : body.details
          ? JSON.stringify(body.details)
          : "",
    ]
      .filter(Boolean)
      .join(" — ");
  } catch {
    // Non-JSON body (gateway error page, empty 502): the status is all we have.
  }
  const err = new Error(
    detail ? `${action} (${res.status}): ${detail}` : `${action} ${res.status}`,
  ) as Error & { status: number };
  err.status = res.status;
  return err;
}
