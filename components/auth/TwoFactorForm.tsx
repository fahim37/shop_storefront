"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldMessageId } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { useAuth } from "@/lib/auth/auth-context";
import { otpSchema } from "@/lib/validation";
import { FormError, toErrorMessage } from "@/components/auth/form-utils";

export interface TwoFactorFormProps {
  /** Challenge id returned by the login response. */
  challengeId: string;
  /** Called once the 2FA challenge is verified and the session is active. */
  onSuccess?: () => void;
  /** Go back to the login form. */
  onBack?: () => void;
}

/** Second-factor step: a 6-digit code completes a pending login challenge. */
export function TwoFactorForm({
  challengeId,
  onSuccess,
  onBack,
}: TwoFactorFormProps) {
  const { completeTwoFactor } = useAuth();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = React.useCallback(
    async (value: string) => {
      const parsed = otpSchema.safeParse(value);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Enter the 6-digit code");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        await completeTwoFactor(challengeId, parsed.data);
        onSuccess?.();
      } catch (err) {
        setError(toErrorMessage(err));
        setSubmitting(false);
      }
    },
    [challengeId, completeTwoFactor, onSuccess],
  );

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(code);
  };

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />

      <Field
        id="twofactor-code"
        label="Verification code"
        error={error ?? undefined}
        description={error ? undefined : "Enter the 6-digit code we sent you."}
      >
        <OtpInput
          id="twofactor-code"
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          onComplete={(next) => void submit(next)}
          disabled={submitting}
          autoFocus
          aria-label="Two-factor verification code"
          aria-invalid={!!error}
          aria-describedby={fieldMessageId("twofactor-code")}
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

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-center text-sm font-medium text-primary hover:underline"
        >
          Back to login
        </button>
      ) : null}
    </form>
  );
}
