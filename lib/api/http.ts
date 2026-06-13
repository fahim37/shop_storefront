import { CLIENT_API_BASE } from "@/lib/config";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/tokens";

/**
 * Normalized API error thrown by the http client. `code` is the backend
 * error code (e.g. "RATE_LIMITED"), `status` the HTTP status.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
    requestId?: string;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
    this.requestId = params.requestId;
  }
}

/** Backend success envelope. */
interface SuccessEnvelope<T> {
  data: T;
  requestId?: string;
}

/** Backend error envelope. */
interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** JSON-serializable request body. */
  body?: unknown;
  /** Skip attaching the Authorization header (used by auth endpoints). */
  skipAuth?: boolean;
  /** Skip the 401 single-flight refresh+retry (used by /auth/refresh itself). */
  skipRefresh?: boolean;
  /** Query params appended to the URL. */
  params?: Record<string, string | number | boolean | null | undefined>;
}

/** Friendly message for rate-limit responses. */
const RATE_LIMIT_MESSAGE =
  "Too many attempts — please wait a few minutes.";

/**
 * Handler invoked when a refresh attempt fails for a protected request.
 * The storefront wires this to open the auth modal; vendor/admin redirect
 * to /login. Defaults to a no-op until configured.
 */
let onUnauthorized: () => void = () => {};

/** Inject the app-specific "session expired" handler. */
export function setOnUnauthorized(handler: () => void): void {
  onUnauthorized = handler;
}

/**
 * Refresh callback. Must perform POST /auth/refresh, persist the new access
 * token, and resolve true on success / false on failure. Injected by the
 * auth layer to avoid a circular import with auth.api.
 */
let refreshFn: (() => Promise<boolean>) | null = null;

/** Inject the single-flight refresh implementation. */
export function setRefreshHandler(fn: () => Promise<boolean>): void {
  refreshFn = fn;
}

/** Shared in-flight refresh promise so concurrent 401s trigger ONE refresh. */
let inFlightRefresh: Promise<boolean> | null = null;

export function runSingleFlightRefresh(): Promise<boolean> {
  if (!refreshFn) return Promise.resolve(false);
  if (!inFlightRefresh) {
    inFlightRefresh = refreshFn()
      .catch(() => false)
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const base = path.startsWith("http")
    ? path
    : `${CLIENT_API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!params) return base;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "object" &&
    (value as { error: unknown }).error !== null
  );
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(status: number, body: unknown): ApiError {
  if (isErrorEnvelope(body)) {
    const { code, message, details, requestId } = body.error;
    const friendly =
      status === 429 || code === "RATE_LIMITED" ? RATE_LIMIT_MESSAGE : message;
    return new ApiError({
      code: code || "UNKNOWN",
      message: friendly || "Request failed",
      status,
      details,
      requestId,
    });
  }
  if (status === 429) {
    return new ApiError({
      code: "RATE_LIMITED",
      message: RATE_LIMIT_MESSAGE,
      status,
    });
  }
  return new ApiError({
    code: "UNKNOWN",
    message:
      typeof body === "string" && body
        ? body
        : `Request failed with status ${status}`,
    status,
  });
}

async function performRequest<T>(
  method: string,
  path: string,
  options: RequestOptions,
  isRetry: boolean,
  raw = false,
): Promise<T> {
  const {
    body,
    skipAuth = false,
    skipRefresh = false,
    params,
    headers,
    ...init
  } = options;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Accept")) finalHeaders.set("Accept", "application/json");

  let serializedBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (
      typeof body === "string" ||
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      body instanceof URLSearchParams
    ) {
      serializedBody = body as BodyInit;
    } else {
      serializedBody = JSON.stringify(body);
      if (!finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
      }
    }
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token && !finalHeaders.has("Authorization")) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(buildUrl(path, params), {
    ...init,
    method,
    headers: finalHeaders,
    body: serializedBody,
    credentials: "include",
  });

  if (response.ok) {
    const parsed = await parseBody(response);
    if (parsed === undefined) return undefined as T;
    // `raw` returns the whole envelope (so callers can read `meta`); otherwise
    // unwrap `.data` for ergonomics.
    if (raw) return parsed as T;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "data" in parsed
    ) {
      return (parsed as SuccessEnvelope<T>).data;
    }
    return parsed as T;
  }

  // 401 on a protected endpoint: single-flight refresh, then retry ONCE.
  if (
    response.status === 401 &&
    !skipAuth &&
    !skipRefresh &&
    !isRetry &&
    refreshFn
  ) {
    const refreshed = await runSingleFlightRefresh();
    if (refreshed) {
      return performRequest<T>(method, path, options, true, raw);
    }
    clearAccessToken();
    onUnauthorized();
  }

  const errorBody = await parseBody(response);
  throw toApiError(response.status, errorBody);
}

/** Low-level request helper. Unwraps `.data`; throws ApiError on failure. */
export function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return performRequest<T>(method, path, options, false);
}

/** Cursor pagination envelope for list endpoints that return `meta`. */
export interface ListEnvelope<T> {
  data: T[];
  meta?: { nextCursor: string | null; hasMore: boolean; limit: number };
}

/**
 * GET a list endpoint and return the FULL envelope (`{ data, meta }`) so the
 * caller can read cursor pagination. Note: several backend list endpoints
 * return a bare array with no `meta` — `meta` is then undefined.
 */
export function getList<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ListEnvelope<T>> {
  return performRequest<ListEnvelope<T>>("GET", path, options, false, true);
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, options),
  getList,
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
};

// Re-export token setter for the auth layer's convenience.
export { setAccessToken };
