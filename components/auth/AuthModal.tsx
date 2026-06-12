"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth, type AuthView } from "@/lib/auth/auth-context";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { TwoFactorForm } from "@/components/auth/TwoFactorForm";
import { OtpForm } from "@/components/auth/OtpForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

interface ViewCopy {
  title: string;
  description: string;
}

const COPY: Record<AuthView, ViewCopy> = {
  login: { title: "Welcome back", description: "Log in to continue shopping." },
  signup: {
    title: "Create your account",
    description: "Join in seconds and start shopping.",
  },
  forgot: {
    title: "Reset your password",
    description: "We'll send reset instructions to your email or phone.",
  },
  twofactor: {
    title: "Verify it's you",
    description: "Enter the 6-digit code to finish logging in.",
  },
  verify: {
    title: "Verify your account",
    description: "Confirm your email or phone to secure your account.",
  },
};

/**
 * Storefront auth modal. Renders the form for the current `authView` and lets
 * the user switch between login / signup / forgot password. Closes on success.
 */
export function AuthModal() {
  const { isAuthOpen, authView, openAuth, closeAuth, setAuthView, user } =
    useAuth();

  // Local state that flows between sub-steps within a single modal session.
  const [challengeId, setChallengeId] = React.useState<string | null>(null);

  const handleClose = React.useCallback(() => {
    // Reset transient step state whenever the modal closes.
    setChallengeId(null);
    closeAuth();
  }, [closeAuth]);

  const copy = COPY[authView];

  // Identifier used by the optional post-signup verify step.
  const verifyIdentifier = user?.email ?? user?.phone ?? "";

  return (
    <Dialog
      open={isAuthOpen}
      onOpenChange={(open) => (open ? openAuth(authView) : handleClose())}
    >
      <DialogContent
        className="max-w-md"
        onOpenAutoFocus={(e) => {
          // Let the first form control receive focus rather than the close X.
          e.preventDefault();
        }}
      >
        <div className="flex flex-col gap-1.5 text-center">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </div>

        <div className="mt-2">
          {authView === "login" && (
            <LoginForm
              onSuccess={handleClose}
              onRequiresTwoFactor={(id) => {
                setChallengeId(id);
                setAuthView("twofactor");
              }}
              onSwitchToSignup={() => setAuthView("signup")}
              onForgotPassword={() => setAuthView("forgot")}
            />
          )}

          {authView === "signup" && (
            <SignupForm
              onSuccess={handleClose}
              onSwitchToLogin={() => setAuthView("login")}
            />
          )}

          {authView === "forgot" && (
            <ForgotPasswordForm
              onBackToLogin={() => setAuthView("login")}
            />
          )}

          {authView === "twofactor" && challengeId && (
            <TwoFactorForm
              challengeId={challengeId}
              onSuccess={handleClose}
              onBack={() => setAuthView("login")}
            />
          )}

          {authView === "twofactor" && !challengeId && (
            <TwoFactorFallback onBack={() => setAuthView("login")} />
          )}

          {authView === "verify" && (
            <OtpForm
              identifier={verifyIdentifier}
              onSuccess={handleClose}
              onSkip={handleClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Shown if the 2FA view is reached without an active challenge. */
function TwoFactorFallback({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Your verification session expired. Please log in again.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="text-center text-sm font-medium text-primary hover:underline"
      >
        Back to login
      </button>
    </div>
  );
}
