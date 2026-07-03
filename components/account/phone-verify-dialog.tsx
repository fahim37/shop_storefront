"use client";

import * as React from "react";
import { ArrowLeft, ShieldCheck, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Field, fieldMessageId } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/http";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Reduce any BD phone input to its 10-digit national part (1XXXXXXXXX): keep
 * digits, drop a leading 880 / 0 (so pasted 01…, 8801…, +8801… all collapse to
 * the same core), then cap at 10 digits so junk can't be typed.
 */
function toBdNational(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

/** A valid BD mobile: 1, an operator digit 3–9, then 8 more digits. */
function isValidBdNational(national: string): boolean {
  return /^1[3-9]\d{8}$/.test(national);
}

interface PhoneVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the phone input (e.g. from an in-progress address form). */
  initialPhone?: string;
  /** Fired after the phone is verified + linked. Receives the E.164 phone. */
  onVerified?: (phone: string) => void;
}

type Step = "phone" | "code";

export function PhoneVerifyDialog({
  open,
  onOpenChange,
  initialPhone = "",
  onVerified,
}: PhoneVerifyDialogProps) {
  const { requestPhoneOtp, linkPhone } = useAuth();

  const [step, setStep] = React.useState<Step>("phone");
  const [national, setNational] = React.useState(() => toBdNational(initialPhone));
  const [e164, setE164] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  // Re-seed each time the dialog opens so a reopen starts clean.
  const [seededOpen, setSeededOpen] = React.useState(false);
  if (open && !seededOpen) {
    setSeededOpen(true);
    setStep("phone");
    setNational(toBdNational(initialPhone));
    setE164("");
    setCode("");
    setError(null);
    setCooldown(0);
  } else if (!open && seededOpen) {
    setSeededOpen(false);
  }

  // Resend cooldown tick.
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(phone: string) {
    setSending(true);
    setError(null);
    try {
      const res = await requestPhoneOtp(phone);
      setE164(phone);
      setStep("code");
      setCode("");
      setCooldown(res.resendInSeconds || 60);
      // Dev convenience: backend echoes the code outside production.
      if (res.devCode) {
        toast.info(`Dev code: ${res.devCode}`, {
          description: "Shown only in development — no SMS provider needed.",
        });
      } else {
        toast.success("Verification code sent", {
          description: `We texted a 6-digit code to ${phone}.`,
        });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not send the code. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleSendSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidBdNational(national)) {
      setError("Enter a valid Bangladeshi mobile number.");
      return;
    }
    void sendCode(`+880${national}`);
  }

  async function verify(value: string) {
    if (verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await linkPhone(e164, value);
      toast.success("Phone verified", {
        description: "Your number is now linked to your account.",
      });
      onVerified?.(e164);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Invalid or expired code.",
      );
      setVerifying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-blue-soft text-primary">
            {step === "phone" ? (
              <Smartphone className="size-6" />
            ) : (
              <ShieldCheck className="size-6" />
            )}
          </div>
          <DialogTitle className="text-center font-display">
            {step === "phone" ? "Verify your phone" : "Enter the code"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "phone"
              ? "Your mobile number is used to confirm and deliver your orders. We'll text you a one-time code."
              : `Enter the 6-digit code we sent to ${e164}.`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <form onSubmit={handleSendSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="verify-phone">Mobile number</Label>
              <div
                className={cn(
                  "flex h-11 items-center rounded-[var(--radius)] border border-input bg-muted transition-colors",
                  "focus-within:border-ring focus-within:bg-background focus-within:ring-2 focus-within:ring-ring",
                  error && "border-destructive focus-within:ring-destructive",
                )}
              >
                <span className="select-none pl-3.5 pr-2 text-sm font-bold text-sub">
                  +880
                </span>
                <span className="h-5 w-px bg-border" />
                <input
                  id="verify-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  autoFocus
                  value={national}
                  onChange={(e) => {
                    setNational(toBdNational(e.target.value));
                    if (error) setError(null);
                  }}
                  placeholder="1XXXXXXXXX"
                  aria-invalid={!!error}
                  aria-describedby={fieldMessageId("verify-phone")}
                  className="h-full flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <p
                id={fieldMessageId("verify-phone")}
                className={cn("text-xs", error ? "text-destructive" : "text-faint")}
              >
                {error ?? "Bangladeshi mobile only — e.g. 01712345678."}
              </p>
            </div>
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={sending}
              disabled={!isValidBdNational(national)}
            >
              Send code
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <Field
              id="verify-code"
              label="Verification code"
              error={error ?? undefined}
            >
              <OtpInput
                id="verify-code"
                value={code}
                onChange={(next) => {
                  setCode(next);
                  if (error) setError(null);
                }}
                onComplete={(next) => void verify(next)}
                disabled={verifying}
                autoFocus
                aria-label="Phone verification code"
                aria-invalid={!!error}
                aria-describedby={fieldMessageId("verify-code")}
              />
            </Field>

            <Button
              type="button"
              fullWidth
              size="lg"
              loading={verifying}
              disabled={code.length !== 6}
              onClick={() => void verify(code)}
            >
              Verify &amp; continue
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                }}
                className="inline-flex items-center gap-1 font-bold text-sub hover:text-primary"
              >
                <ArrowLeft className="size-4" /> Change number
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || sending}
                onClick={() => void sendCode(e164)}
                className="font-bold text-primary hover:underline disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
