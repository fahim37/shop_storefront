/**
 * In-memory access token store.
 *
 * The access token is intentionally kept ONLY in a module-scoped variable —
 * never in localStorage/sessionStorage — to limit XSS exposure. The refresh
 * token lives in a backend httpOnly cookie. On a full page reload this module
 * resets, and the session is restored via a single silent POST /auth/refresh.
 */

let accessToken: string | null = null;
let accessTokenExpiresAt: number | null = null;

/** Returns the current in-memory access token, or null when logged out. */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Store the access token (and optional expiry as an epoch-ms timestamp or
 * ISO string). Pass null to clear.
 */
export function setAccessToken(
  token: string | null,
  expiresAt?: number | string | null,
): void {
  accessToken = token;
  if (token === null) {
    accessTokenExpiresAt = null;
    return;
  }
  if (expiresAt == null) {
    accessTokenExpiresAt = null;
  } else if (typeof expiresAt === "number") {
    accessTokenExpiresAt = expiresAt;
  } else {
    const parsed = Date.parse(expiresAt);
    accessTokenExpiresAt = Number.isNaN(parsed) ? null : parsed;
  }
}

/** Clear the stored access token (e.g. on logout or failed refresh). */
export function clearAccessToken(): void {
  accessToken = null;
  accessTokenExpiresAt = null;
}

/** True when an access token is currently held in memory. */
export function hasAccessToken(): boolean {
  return accessToken !== null;
}

/**
 * Best-effort check for whether the stored token is past (or near) expiry.
 * Returns false when no expiry is known. `skewMs` adds a safety margin.
 */
export function isAccessTokenExpired(skewMs = 0): boolean {
  if (accessTokenExpiresAt == null) return false;
  return Date.now() + skewMs >= accessTokenExpiresAt;
}
