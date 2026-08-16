/**
 * Is this URL on that origin?
 *
 * These specs used `url.startsWith(BASE)`, which CodeQL flags as incomplete URL
 * substring sanitization — and it is right in a way that matters here, because
 * several of the call sites are **redirect-leak assertions**. A substring check
 * accepts `https://qual.stay.portugalodyssey.pt.evil.com`, so a spec asserting
 * "we stayed on our own origin" would pass while sitting on somebody else's.
 * That is the same defect class this directory keeps finding in the app: a
 * verification that cannot fail the way it claims to.
 *
 * Compares parsed origins, so scheme, host and port must all match. A malformed
 * URL is not on any origin, so it answers false rather than throwing — a spec
 * should report a failed assertion, not die mid-run.
 */
export function isSameOrigin(url, base) {
  try {
    return new URL(url).origin === new URL(base).origin;
  } catch {
    return false;
  }
}
