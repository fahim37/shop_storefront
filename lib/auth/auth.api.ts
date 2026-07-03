import { http } from "@/lib/api/http";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type OtpPurpose = "signup" | "login" | "password_reset" | "2fa";

/** 'lite' = social/guest account with no verified phone yet; 'active' = full. */
export type AccountStatus = "lite" | "active" | "disabled";

/** Authenticated user as returned by GET /me. */
export interface MeResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  accountStatus: AccountStatus;
  /**
   * The account's phone in a display-safe form: null when it's still the
   * social-signup placeholder (`+8809…`) rather than a real, verified number.
   */
  verifiedPhone: string | null;
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

/* -------------------------------------------------------------------------- */
/* Phone verification (link an OTP-verified phone to the current account)      */
/* -------------------------------------------------------------------------- */

export interface PhoneOtpResult {
  sent: boolean;
  channel: "sms" | "whatsapp";
  /** Seconds to wait before requesting another code. */
  resendInSeconds: number;
  /** Echoed only outside production so dev flows are testable without SMS. */
  devCode?: string;
}

/**
 * POST /auth/phone/request-otp — send a 6-digit SMS code. `purpose` is
 * `phone_link` when attaching a phone to an already-signed-in account.
 * Accepts loose BD input (01…, 8801…, +8801…); the backend normalizes it.
 */
export function requestPhoneOtp(
  phone: string,
  purpose: "phone_link" | "login" | "signup" | "guest" = "phone_link",
): Promise<PhoneOtpResult> {
  return http.post<PhoneOtpResult>(
    "/auth/phone/request-otp",
    { phone, purpose, channel: "sms" },
    { skipAuth: true },
  );
}

/**
 * POST /auth/phone/link — attach a verified phone to the current account
 * (promotes a social 'lite' account to 'active'). Requires a Bearer token,
 * which the http client attaches automatically.
 */
export function linkPhone(
  phone: string,
  code: string,
): Promise<{ linked: true; accountStatus: AccountStatus }> {
  return http.post<{ linked: true; accountStatus: AccountStatus }>(
    "/auth/phone/link",
    { phone, code },
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
  accountStatus: AccountStatus;
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
  // Social sign-in seeds a sentinel phone (+8809…) that is never a real BD
  // mobile; treat it as "no phone" until the user verifies a real number.
  const isPlaceholderPhone = !raw.isPhoneVerified || /^\+8809/.test(raw.phone);
  return {
    id: raw.id,
    fullName: raw.profile?.fullName ?? raw.email,
    email: raw.email,
    phone: raw.phone,
    photoUrl: raw.profile?.photoUrl ?? null,
    isEmailVerified: raw.isEmailVerified,
    isPhoneVerified: raw.isPhoneVerified,
    accountStatus: raw.accountStatus,
    verifiedPhone: isPlaceholderPhone ? null : raw.phone,
  };
}
