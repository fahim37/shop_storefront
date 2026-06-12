"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldMessageId } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { useAuth } from "@/lib/auth/auth-context";
import { otpSchema } from "@/lib/validation";
import { FormError, toErrorMessage } from "@/components/auth/form-utils";

export interface OtpFormProps {
  /** Identifier (email or phone) the signup OTP was sent to. */
  identifier: string;
  /** Called after the code verifies successfully. */
  onSuccess?: () => void;
  /** Dismiss without verifying (verification is optional post-signup). */
  onSkip?: () => void;
}

/**
 * Optional signup verification: enter the 6-digit OTP, with a resend action.
 * Uses purpose "signup" per the backend contract.
 */
export function OtpForm({ identifier, onSuccess, onSkip }: OtpFormProps) {
  const { verifyOtp, requestOtp } = useAuth();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  const submit = React.useCallback(
    async (value: string) => {
      const parsed = otpSchema.safeParse(value);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Enter the 6-digit code");
        return;
      }
      setError(null);
      setInfo(null);
      setSubmitting(true);
      try {
        await verifyOtp(identifier, parsed.data);
        onSuccess?.();
      } catch (err) {
        setError(toErrorMessage(err));
        setSubmitting(false);
      }
    },
    [identifier, verifyOtp, onSuccess],
  );

  const handleResend = React.useCallback(async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await requestOtp(identifier, "signup");
      setInfo("A new code has been sent.");
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setResending(false);
    }
  }, [identifier, requestOtp]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(code);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      {info ? (
        <p role="status" className="text-sm text-muted-foreground">
          {info}
        </p>
      ) : null}

      <Field
        id="otp-code"
        label="Verification code"
        error={error ?? undefined}
        description={error ? undefined : `Enter the 6-digit code sent to ${identifier}.`}
      >
        <OtpInput
          id="otp-code"
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          onComplete={(next) => void submit(next)}
          disabled={submitting}
          autoFocus
          aria-label="Signup verification code"
          aria-invalid={!!error}
          aria-describedby={fieldMessageId("otp-code")}
        />
      </Field>

      <Button
        type="submit"
        fullWidth
        loading={submitting}
        disabled={code.length !== 6}
      >
        Verify
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="font-medium text-primary hover:underline disabled:opacity-50"
        >
          {resending ? "Resending…" : "Resend code"}
        </button>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="font-medium text-muted-foreground hover:underline"
          >
            Skip for now
          </button>
        ) : null}
      </div>
    </form>
  );
}
