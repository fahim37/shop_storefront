"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldMessageId } from "@/components/ui/field";
import { useAuth } from "@/lib/auth/auth-context";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validation";
import { FormError, toErrorMessage } from "@/components/auth/form-utils";

export interface ResetPasswordFormProps {
  /** Reset token read from the URL's ?token= query param. */
  token: string;
  /** Called after the password is reset successfully. */
  onSuccess?: () => void;
}

/** Set a new password using the reset token from the URL. */
export function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const { confirmPasswordReset } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await confirmPasswordReset(token, values.newPassword);
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setFormError(toErrorMessage(err));
    }
  });

  if (!token) {
    return (
      <FormError message="This reset link is missing or invalid. Request a new one." />
    );
  }

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">
        Your password has been reset. You can now log in with your new password.
      </p>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />

      <Field
        id="reset-newPassword"
        label="New password"
        error={errors.newPassword?.message}
        description={
          errors.newPassword
            ? undefined
            : "At least 12 characters, with a letter and a number"
        }
      >
        <Input
          id="reset-newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          aria-invalid={!!errors.newPassword}
          aria-describedby={fieldMessageId("reset-newPassword")}
          {...register("newPassword")}
        />
      </Field>

      <Field
        id="reset-confirmPassword"
        label="Confirm password"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="reset-confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={
            errors.confirmPassword
              ? fieldMessageId("reset-confirmPassword")
              : undefined
          }
          {...register("confirmPassword")}
        />
      </Field>

      <Button type="submit" fullWidth loading={isSubmitting}>
        Reset password
      </Button>
    </form>
  );
}
