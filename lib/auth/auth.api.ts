import { http } from "@/lib/api/http";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type OtpPurpose = "signup" | "login" | "password_reset" | "2fa";

/** Authenticated user as returned by GET /me. */
export interface MeResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

/** Token bundle returned by login (success branch), 2FA verify, refresh, social. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface SignupResponse {
  userId: string;
  emailOtpSent: boolean;
  phoneOtpSent: boolean;
}

/** Login may succeed outright or require a second factor. */
export interface LoginSuccess extends TokenPair {
  userId: string;
}
export interface LoginRequires2fa {
  requires2fa: true;
  challengeId: string;
}
export type LoginResponse = LoginSuccess | LoginRequires2fa;

/** Narrowing helper for the 2FA branch of a login response. */
export function isRequires2fa(
  response: LoginResponse,
): response is LoginRequires2fa {
  return (
    "requires2fa" in response && response.requires2fa === true
  );
}

/* -------------------------------------------------------------------------- */
/* Endpoint wrappers                                                          */
/* -------------------------------------------------------------------------- */

export interface SignupPayload {
  email: string;
  phone: string;
  password: string;
  fullName: string;
}

/** POST /auth/signup — auto-sends OTP to email + phone. Returns no tokens. */
export function signup(payload: SignupPayload): Promise<SignupResponse> {
  return http.post<SignupResponse>("/auth/signup", payload, { skipAuth: true });
}

/** POST /auth/login — identifier = email OR +880 phone. */
export function login(
  identifier: string,
  password: string,
): Promise<LoginResponse> {
  return http.post<LoginResponse>(
    "/auth/login",
    { identifier, password },
    { skipAuth: true },
  );
}

/** POST /auth/2fa/verify — completes a 2FA login challenge. */
export function verifyTwoFactor(
  challengeId: string,
  code: string,
): Promise<TokenPair> {
  return http.post<TokenPair>(
    "/auth/2fa/verify",
    { challengeId, code },
    { skipAuth: true },
  );
}

/** POST /auth/otp/request — (re)send an OTP for the given purpose. */
export function requestOtp(
  identifier: string,
  purpose: OtpPurpose,
): Promise<{ sent: true }> {
  return http.post<{ sent: true }>(
    "/auth/otp/request",
    { identifier, purpose },
    { skipAuth: true },
  );
}

/** POST /auth/otp/verify — verify a signup OTP. */
export function verifyOtp(
  identifier: string,
  code: string,
): Promise<{ verified: true }> {
  return http.post<{ verified: true }>(
    "/auth/otp/verify",
    { identifier, purpose: "signup", code },
    { skipAuth: true },
  );
}

/**
 * POST /auth/refresh — omit body to use the httpOnly cookie. Rotates the
 * refresh token; replaying an old token burns all sessions. `skipRefresh`
 * prevents the http client from recursively trying to refresh on a 401.
 */
export function refresh(refreshToken?: string): Promise<TokenPair> {
  return http.post<TokenPair>(
    "/auth/refresh",
    refreshToken ? { refreshToken } : {},
    { skipAuth: true, skipRefresh: true },
  );
}

/** POST /auth/logout — Authorization header is attached automatically. */
export function logout(refreshToken?: string): Promise<void> {
  return http.post<void>(
    "/auth/logout",
    refreshToken ? { refreshToken } : {},
  );
}

/** POST /auth/password-reset/request */
export function requestPasswordReset(
  identifier: string,
): Promise<{ requested: true }> {
  return http.post<{ requested: true }>(
    "/auth/password-reset/request",
    { identifier },
    { skipAuth: true },
  );
}

/** POST /auth/password-reset/confirm */
export function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<{ reset: true }> {
  return http.post<{ reset: true }>(
    "/auth/password-reset/confirm",
    { token, newPassword },
    { skipAuth: true },
  );
}

/** POST /auth/social/google — exchange a GIS id token for tokens. */
export function socialGoogle(idToken: string): Promise<TokenPair> {
  return http.post<TokenPair>(
    "/auth/social/google",
    { idToken },
    { skipAuth: true },
  );
}

/**
 * Raw `GET /me` envelope from store_backend (profile is nested under
 * `profile`). We flatten it to {@link MeResponse} at this boundary so the
 * rest of the auth layer keeps a stable, flat shape.
 */
interface RawMe {
  id: string;
  email: string;
  phone: string;
  userType: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: string;
  lastLoginAt: string | null;
  profile: {
    fullName: string;
    photoUrl: string | null;
  } | null;
}

/** GET /me — authenticated user profile (flattened). */
export async function getMe(): Promise<MeResponse> {
  const raw = await http.get<RawMe>("/me");
  return {
    id: raw.id,
    fullName: raw.profile?.fullName ?? raw.email,
    email: raw.email,
    phone: raw.phone,
    isEmailVerified: raw.isEmailVerified,
    isPhoneVerified: raw.isPhoneVerified,
  };
}
