"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldMessageId } from "@/components/ui/field";
import { useAuth } from "@/lib/auth/auth-context";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validation";
import { FormError, toErrorMessage } from "@/components/auth/form-utils";

export interface ForgotPasswordFormProps {
  /** Called after the reset email/SMS is requested. */
  onSuccess?: () => void;
  /** Return to the login form. */
  onBackToLogin?: () => void;
}

/** Request a password reset link/code by email or phone. */
export function ForgotPasswordForm({
  onSuccess,
  onBackToLogin,
}: ForgotPasswordFormProps) {
  const { requestPasswordReset } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identifier: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await requestPasswordReset(values.identifier);
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setFormError(toErrorMessage(err));
    }
  });

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">
            {getValues("identifier")}
          </span>
          , we&apos;ve sent reset instructions. Check your email or phone.
        </p>
        {onBackToLogin ? (
          <Button type="button" variant="soft" fullWidth onClick={onBackToLogin}>
            Back to login
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />

      <Field
        id="forgot-identifier"
        label="Email or phone"
        error={errors.identifier?.message}
      >
        <Input
          id="forgot-identifier"
          autoComplete="username"
          placeholder="you@example.com or +8801712345678"
          aria-invalid={!!errors.identifier}
          aria-describedby={
            errors.identifier ? fieldMessageId("forgot-identifier") : undefined
          }
          {...register("identifier")}
        />
      </Field>

      <Button type="submit" fullWidth loading={isSubmitting}>
        Send reset link
      </Button>

      {onBackToLogin ? (
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-center text-sm font-medium text-primary hover:underline"
        >
          Back to login
        </button>
      ) : null}
    </form>
  );
}
