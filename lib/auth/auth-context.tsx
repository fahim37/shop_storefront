"use client";

import * as React from "react";
import {
  clearAccessToken,
  setAccessToken,
} from "@/lib/auth/tokens";
import {
  setOnUnauthorized,
  setRefreshHandler,
} from "@/lib/api/http";
import {
  confirmPasswordReset as confirmPasswordResetApi,
  getMe,
  login as loginApi,
  logout as logoutApi,
  refresh as refreshApi,
  requestOtp as requestOtpApi,
  requestPasswordReset as requestPasswordResetApi,
  signup as signupApi,
  socialGoogle,
  verifyOtp as verifyOtpApi,
  verifyTwoFactor,
  isRequires2fa,
  type LoginResponse,
  type MeResponse,
  type OtpPurpose,
  type SignupPayload,
  type TokenPair,
} from "@/lib/auth/auth.api";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/** Which form the storefront auth modal is currently showing. */
export type AuthView = "login" | "signup" | "forgot" | "twofactor" | "verify";

/** Result of `login`, surfaced so the UI can branch into the 2FA step. */
export type LoginResult =
  | { status: "authenticated" }
  | { status: "twofactor"; challengeId: string };

export interface AuthContextValue {
  /** The authenticated user, or null when logged out / still loading. */
  user: MeResponse | null;
  /** Coarse-grained auth lifecycle state. */
  status: AuthStatus;
  /** Convenience flag derived from `status`. */
  isAuthenticated: boolean;

  /* --- session actions --- */

  /** Sign up, then immediately log in and load the profile (no OTP gate). */
  signup: (payload: SignupPayload) => Promise<void>;
  /**
   * Log in with an identifier + password. Resolves with `twofactor` (and the
   * challenge id) when a second factor is required, else `authenticated`.
   */
  login: (identifier: string, password: string) => Promise<LoginResult>;
  /** Complete a pending 2FA challenge. */
  completeTwoFactor: (challengeId: string, code: string) => Promise<void>;
  /** Exchange a Google ID token (from GIS) for a session. */
  loginWithGoogle: (idToken: string) => Promise<void>;
  /** Log out: best-effort backend call, then clear local session. */
  logout: () => Promise<void>;
  /** Silent refresh; returns true when a session was (re)established. */
  refreshSession: () => Promise<boolean>;

  /* --- password reset --- */

  requestPasswordReset: (identifier: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;

  /* --- otp (optional post-signup verification) --- */

  requestOtp: (identifier: string, purpose: OtpPurpose) => Promise<void>;
  verifyOtp: (identifier: string, code: string) => Promise<void>;

  /* --- storefront modal controls --- */

  /** Whether the auth modal is currently open. */
  isAuthOpen: boolean;
  /** The form the modal should render. */
  authView: AuthView;
  /** Open the auth modal, optionally on a specific view (default "login"). */
  openAuth: (view?: AuthView) => void;
  /** Close the auth modal. */
  closeAuth: () => void;
  /** Set the active modal view without toggling open state. */
  setAuthView: (view: AuthView) => void;
  /**
   * Run `action` when authenticated; otherwise open the auth modal so the
   * user can sign in first. Returns true when the action ran.
   */
  requireAuth: (action: () => void, view?: AuthView) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<MeResponse | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>("loading");

  const [isAuthOpen, setIsAuthOpen] = React.useState(false);
  const [authView, setAuthViewState] = React.useState<AuthView>("login");

  /**
   * The latest refresh token returned by the backend. The httpOnly cookie is
   * the primary mechanism; we also pass this explicitly to logout so the
   * server can revoke the exact session.
   */
  const refreshTokenRef = React.useRef<string | null>(null);

  /** Persist a token bundle into the in-memory store + local refresh ref. */
  const applyTokens = React.useCallback((tokens: TokenPair) => {
    setAccessToken(tokens.accessToken, tokens.expiresAt);
    refreshTokenRef.current = tokens.refreshToken;
  }, []);

  /** Wipe all local session state. */
  const clearSession = React.useCallback(() => {
    clearAccessToken();
    refreshTokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  /** Load /me and mark the session authenticated. */
  const loadProfile = React.useCallback(async () => {
    const me = await getMe();
    setUser(me);
    setStatus("authenticated");
  }, []);

  /* --- storefront modal controls --- */

  const openAuth = React.useCallback((view: AuthView = "login") => {
    setAuthViewState(view);
    setIsAuthOpen(true);
  }, []);

  const closeAuth = React.useCallback(() => {
    setIsAuthOpen(false);
  }, []);

  const setAuthView = React.useCallback((view: AuthView) => {
    setAuthViewState(view);
  }, []);

  /* --- session actions --- */

  const refreshSession = React.useCallback(async (): Promise<boolean> => {
    try {
      const tokens = await refreshApi(refreshTokenRef.current ?? undefined);
      applyTokens(tokens);
      await loadProfile();
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [applyTokens, loadProfile, clearSession]);

  const signup = React.useCallback(
    async (payload: SignupPayload) => {
      // 1) create the account (no tokens returned, OTP auto-sent)
      await signupApi(payload);
      // 2) immediately log in with the same email so the user is signed in
      const response = await loginApi(payload.email, payload.password);
      if (isRequires2fa(response)) {
        // Unexpected for a brand-new account, but handle defensively.
        setStatus("unauthenticated");
        throw new Error("Additional verification is required to continue.");
      }
      applyTokens(response);
      // 3) load the profile
      await loadProfile();
    },
    [applyTokens, loadProfile],
  );

  const login = React.useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      const response: LoginResponse = await loginApi(identifier, password);
      if (isRequires2fa(response)) {
        return { status: "twofactor", challengeId: response.challengeId };
      }
      applyTokens(response);
      await loadProfile();
      return { status: "authenticated" };
    },
    [applyTokens, loadProfile],
  );

  const completeTwoFactor = React.useCallback(
    async (challengeId: string, code: string) => {
      const tokens = await verifyTwoFactor(challengeId, code);
      applyTokens(tokens);
      await loadProfile();
    },
    [applyTokens, loadProfile],
  );

  const loginWithGoogle = React.useCallback(
    async (idToken: string) => {
      const tokens = await socialGoogle(idToken);
      applyTokens(tokens);
      await loadProfile();
    },
    [applyTokens, loadProfile],
  );

  const logout = React.useCallback(async () => {
    try {
      await logoutApi(refreshTokenRef.current ?? undefined);
    } catch {
      // Logout is best-effort; clear local state regardless.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  /* --- password reset --- */

  const requestPasswordReset = React.useCallback(
    async (identifier: string) => {
      await requestPasswordResetApi(identifier);
    },
    [],
  );

  const confirmPasswordReset = React.useCallback(
    async (token: string, newPassword: string) => {
      await confirmPasswordResetApi(token, newPassword);
    },
    [],
  );

  /* --- otp --- */

  const requestOtp = React.useCallback(
    async (identifier: string, purpose: OtpPurpose) => {
      await requestOtpApi(identifier, purpose);
    },
    [],
  );

  const verifyOtp = React.useCallback(
    async (identifier: string, code: string) => {
      await verifyOtpApi(identifier, code);
      // Reflect verified state locally without a full refetch when possible.
      setUser((prev) =>
        prev ? { ...prev, isEmailVerified: true } : prev,
      );
    },
    [],
  );

  /* --- requireAuth --- */

  const requireAuth = React.useCallback(
    (action: () => void, view: AuthView = "login"): boolean => {
      if (status === "authenticated") {
        action();
        return true;
      }
      openAuth(view);
      return false;
    },
    [status, openAuth],
  );

  /* --- wire the http client's refresh + unauthorized hooks --- */

  React.useEffect(() => {
    setRefreshHandler(async () => {
      try {
        const tokens = await refreshApi(refreshTokenRef.current ?? undefined);
        applyTokens(tokens);
        return true;
      } catch {
        return false;
      }
    });
    // Storefront: a failed protected request opens the auth modal.
    setOnUnauthorized(() => {
      clearSession();
      openAuth("login");
    });
  }, [applyTokens, clearSession, openAuth]);

  /* --- one silent refresh on mount to restore a session post-reload --- */

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokens = await refreshApi();
        if (cancelled) return;
        applyTokens(tokens);
        await loadProfile();
      } catch {
        if (!cancelled) clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run exactly once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      signup,
      login,
      completeTwoFactor,
      loginWithGoogle,
      logout,
      refreshSession,
      requestPasswordReset,
      confirmPasswordReset,
      requestOtp,
      verifyOtp,
      isAuthOpen,
      authView,
      openAuth,
      closeAuth,
      setAuthView,
      requireAuth,
    }),
    [
      user,
      status,
      signup,
      login,
      completeTwoFactor,
      loginWithGoogle,
      logout,
      refreshSession,
      requestPasswordReset,
      confirmPasswordReset,
      requestOtp,
      verifyOtp,
      isAuthOpen,
      authView,
      openAuth,
      closeAuth,
      setAuthView,
      requireAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth context. Throws when used outside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}
