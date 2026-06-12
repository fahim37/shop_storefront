"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Dismissible "verify your email/phone" nudge. Only shown to authenticated
 * users whose email is not yet verified. Opens the optional OTP verify step.
 */
export function VerifyNudge() {
  const { status, user, openAuth } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);

  if (status !== "authenticated" || !user) return null;
  if (user.isEmailVerified) return null;
  if (dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">
          Verify your email to secure your account
        </span>
        <span className="text-muted-foreground">
          We sent a code to{" "}
          <span className="font-medium text-foreground">{user.email}</span>.{" "}
          <button
            type="button"
            onClick={() => openAuth("verify")}
            className="font-medium text-primary hover:underline"
          >
            Verify now
          </button>
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
