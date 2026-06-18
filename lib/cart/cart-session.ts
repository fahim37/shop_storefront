/**
 * Guest cart session token. The cart is server-owned; an anonymous shopper is
 * identified by an opaque `X-Cart-Session` header token persisted in
 * localStorage. On login the guest cart is merged into the user cart via
 * `POST /cart/merge`, after which the token is cleared.
 */

const STORAGE_KEY = "gcl.cart.session";

/** Subscribers notified when the token is minted or cleared in this tab. */
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

/**
 * Subscribe to guest-token changes (mint/clear in this tab, plus cross-tab
 * `storage` events). Pairs with {@link getCartSessionToken} for
 * `useSyncExternalStore`.
 */
export function subscribeCartSessionToken(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(onChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** Generate a UUID (crypto.randomUUID with a tiny fallback). */
export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Read the current guest cart session token, if any (client-only). */
export function getCartSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Get the existing guest token or lazily create + persist one. Used right
 * before a guest cart write so anonymous carts get a stable identity.
 */
export function ensureCartSessionToken(): string {
  const existing = getCartSessionToken();
  if (existing) return existing;
  const token = uuid();
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* storage unavailable — token still returned for this session */
  }
  notify();
  return token;
}

/** Clear the guest token (after a successful merge into the user cart). */
export function clearCartSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

/**
 * Header bag for cart requests. When `create` is true (a write), a token is
 * minted if absent; reads pass an existing token only (so a fresh visitor's
 * GET doesn't eagerly create a server cart until they act).
 */
export function cartSessionHeaders(create = false): Record<string, string> {
  const token = create ? ensureCartSessionToken() : getCartSessionToken();
  return token ? { "X-Cart-Session": token } : {};
}
