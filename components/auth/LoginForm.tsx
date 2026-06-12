"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldMessageId } from "@/components/ui/field";
import { useAuth } from "@/lib/auth/auth-context";
import { loginSchema, type LoginFormValues } from "@/lib/validation";
import { FormError, toErrorMessage } from "@/components/auth/form-utils";
import { SocialButtons } from "@/components/auth/SocialButtons";

export interface LoginFormProps {
  /** Called on a fully-authenticated login (no 2FA, or after Google). */
  onSuccess?: () => void;
  /** Called when the backend requires a second factor. */
  onRequiresTwoFactor?: (challengeId: string) => void;
  onSwitchToSignup?: () => void;
  onForgotPassword?: () => void;
}

/** Identifier + password login. Branches into 2FA when required. */
export function LoginForm({
  onSuccess,
  onRequiresTwoFactor,
  onSwitchToSignup,
  onForgotPassword,
}: LoginFormProps) {
  const { login } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await login(values.identifier, values.password);
      if (result.status === "twofactor") {
        onRequiresTwoFactor?.(result.challengeId);
        return;
      }
      onSuccess?.();
    } catch (err) {
      setFormError(toErrorMessage(err));
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <SocialButtons onSuccess={onSuccess} />

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />

        <Field
          id="login-identifier"
          label="Email or phone"
          error={errors.identifier?.message}
        >
          <Input
            id="login-identifier"
            autoComplete="username"
            placeholder="you@example.com or +8801712345678"
            aria-invalid={!!errors.identifier}
            aria-describedby={
              errors.identifier ? fieldMessageId("login-identifier") : undefined
            }
            {...register("identifier")}
          />
        </Field>

        <Field
          id="login-password"
          label="Password"
          error={errors.password?.message}
        >
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            aria-invalid={!!errors.password}
            aria-describedby={
              errors.password ? fieldMessageId("login-password") : undefined
            }
            {...register("password")}
          />
        </Field>

        {onForgotPassword ? (
          <div className="-mt-1 text-right">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        <Button type="submit" fullWidth loading={isSubmitting}>
          Log in
        </Button>
      </form>

      {onSwitchToSignup ? (
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </button>
        </p>
      ) : null}
    </div>
  );
}
