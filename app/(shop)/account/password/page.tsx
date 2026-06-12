"use client";

import * as React from "react";
import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/http";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function ChangePasswordPage() {
  const { user, requestPasswordReset } = useAuth();

  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const email = user?.email ?? null;

  const handleSend = async () => {
    if (!email || pending) return;
    setPending(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
      toast.success("Check your inbox", {
        description: `We’ve emailed a secure reset link to ${email}.`,
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn’t send the reset link. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-extrabold sm:text-2xl">
        Change password
      </h1>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-soft text-primary">
            <KeyRound className="size-5" />
          </span>
          <div>
            <CardTitle className="font-display text-base font-extrabold">
              Reset your password
            </CardTitle>
            <p className="mt-0.5 text-sm text-sub">
              For your security, we set a new password through a verified email
              link rather than in the app.
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <p className="text-sm text-sub">
            We’ll send a secure, single-use reset link to{" "}
            {email ? (
              <span className="font-bold text-ink">{email}</span>
            ) : (
              "your account email"
            )}
            . Open it on this device, choose a new password, and you’re done.
          </p>

          {sent ? (
            <div className="flex items-start gap-3 rounded-xl border border-green/30 bg-green-soft p-4">
              <MailCheck className="mt-0.5 size-5 shrink-0 text-green" />
              <div className="text-sm">
                <p className="font-bold text-ink">Reset link sent</p>
                <p className="mt-0.5 text-sub">
                  Check your inbox{email ? ` at ${email}` : ""}. The link expires
                  shortly — didn’t get it? You can request another.
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={() => void handleSend()}
              loading={pending}
              disabled={pending || !email}
            >
              {sent ? "Resend reset link" : "Email me a reset link"}
            </Button>
            {pending && (
              <span className="inline-flex items-center gap-1.5 text-sm text-faint">
                <Spinner className="size-4" /> Sending…
              </span>
            )}
          </div>

          {!email && (
            <p className="text-xs text-red">
              We couldn’t read your account email. Please refresh and try again.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Security note ------------------------------------------------------ */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/60 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="text-sm text-sub">
          <p className="font-bold text-ink">Keeping your account safe</p>
          <p className="mt-0.5">
            GCL will never ask for your password by email, phone or chat.
            Only follow reset links you requested yourself, and never share the
            link with anyone.
          </p>
        </div>
      </div>
    </div>
  );
}
