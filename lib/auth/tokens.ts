/**
 * In-memory access token store.
 *
 * The access token is intentionally kept ONLY in a module-scoped variable —
 * never in localStorage/sessionStorage — to limit XSS exposure. The refresh
 * token lives in a backend httpOnly cookie. On a full page reload this module
 * resets, and the session is restored via a single silent POST /auth/refresh.
 */

let accessToken: string | null = null;

/** Returns the current in-memory access token, or null when logged out. */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Store the access token. Pass null to clear. Expiry isn't tracked — a stale
 * token simply 401s and the http client's single-flight refresh replaces it.
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Clear the stored access token (e.g. on logout or failed refresh). */
export function clearAccessToken(): void {
  accessToken = null;
}

/** True when an access token is currently held in memory. */
export function hasAccessToken(): boolean {
  return accessToken !== null;
}

/* -------------------------------------------------------------------------- */
/* Session hint                                                               */
/* -------------------------------------------------------------------------- */

/**
 * localStorage marker meaning "this browser has held a session before".
 *
 * The refresh token is an httpOnly cookie we can't read, so without a hint the
 * app must fire a POST /auth/refresh on EVERY full page load just to learn the
 * visitor is anonymous — a wasted backend hit for the (majority) logged-out
 * traffic. The flag carries no secrets: it only skips the bootstrap refresh
 * when absent. Worst case (user clears storage but still has a valid cookie)
 * they simply appear logged out until they sign in again.
 */
const SESSION_HINT_KEY = "gcl.hadSession";

export function markSessionHint(): void {
  try {
    window.localStorage.setItem(SESSION_HINT_KEY, "1");
  } catch {
    /* storage unavailable (SSR, private mode) — hint is best-effort */
  }
}

export function clearSessionHint(): void {
  try {
    window.localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSessionHint(): boolean {
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}
