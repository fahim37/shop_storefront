"use client";

import * as React from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { GOOGLE_CLIENT_ID, isGoogleAuthEnabled } from "@/lib/config";
import { useAuth } from "@/lib/auth/auth-context";
import { FormError, toErrorMessage } from "@/components/auth/form-utils";

/* -------------------------------------------------------------------------- */
/* Minimal Google Identity Services typings (only what we use)                */
/* -------------------------------------------------------------------------- */

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleButtonConfig {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
}

interface GoogleIdApi {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
}

interface GoogleAccountsApi {
  accounts: { id: GoogleIdApi };
}

declare global {
  interface Window {
    google?: GoogleAccountsApi;
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

/** Inline Google "G" mark. */
function GoogleIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export interface SocialButtonsProps {
  /** Called after a successful Google sign-in. */
  onSuccess?: () => void;
}

/**
 * "Continue with Google" using Google Identity Services. Disabled with a
 * helper hint when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.
 */
export function SocialButtons({ onSuccess }: SocialButtonsProps) {
  const { loginWithGoogle } = useAuth();
  const [scriptReady, setScriptReady] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initializedRef = React.useRef(false);
  const buttonRef = React.useRef<HTMLDivElement | null>(null);

  // Keep the latest success/login callbacks for the GIS callback closure.
  const onSuccessRef = React.useRef(onSuccess);
  const loginRef = React.useRef(loginWithGoogle);
  React.useEffect(() => {
    onSuccessRef.current = onSuccess;
    loginRef.current = loginWithGoogle;
  }, [onSuccess, loginWithGoogle]);

  const handleCredential = React.useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        setError("Google sign-in was cancelled.");
        setPending(false);
        return;
      }
      try {
        setPending(true);
        await loginRef.current(response.credential);
        onSuccessRef.current?.();
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setPending(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (!scriptReady || !isGoogleAuthEnabled) return;
    const api = window.google?.accounts.id;
    const parent = buttonRef.current;
    if (!api || !parent) return;

    if (!initializedRef.current) {
      api.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        cancel_on_tap_outside: true,
      });
      initializedRef.current = true;
    }

    parent.innerHTML = "";
    api.renderButton(parent, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "center",
      width: parent.clientWidth || 400,
    });
  }, [handleCredential, scriptReady]);

  if (!isGoogleAuthEnabled) {
    return (
      <Button
        type="button"
        variant="soft"
        fullWidth
        disabled
        aria-disabled="true"
      >
        <GoogleIcon />
        Continue with Google
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Script
        src={GIS_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div
        ref={buttonRef}
        className={scriptReady && !pending ? "flex min-h-10 w-full justify-center" : "hidden"}
      />
      {pending ? (
        <Button type="button" variant="soft" fullWidth loading disabled>
          Continue with Google
        </Button>
      ) : null}
      {!scriptReady ? (
        <p className="text-center text-xs text-muted-foreground">
          Loading Google sign-in…
        </p>
      ) : null}
      <FormError message={error} />
    </div>
  );
}
