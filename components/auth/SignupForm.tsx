"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldMessageId } from "@/components/ui/field";
import { useAuth } from "@/lib/auth/auth-context";
import { signupSchema, type SignupFormValues } from "@/lib/validation";
import { FormError, toErrorMessage } from "@/components/auth/form-utils";
import { SocialButtons } from "@/components/auth/SocialButtons";

export interface SignupFormProps {
  /** Called once the account is created and the user is signed in. */
  onSuccess?: () => void;
  /** Switch to the login view (modal). */
  onSwitchToLogin?: () => void;
}

/**
 * Single-screen signup. On submit the auth context runs signup → login →
 * /me so the user is signed in immediately (no OTP gate).
 */
export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const { signup } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signup(values);
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

      <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />

        <Field id="signup-fullName" label="Full name" error={errors.fullName?.message}>
          <Input
            id="signup-fullName"
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={!!errors.fullName}
            aria-describedby={
              errors.fullName ? fieldMessageId("signup-fullName") : undefined
            }
            {...register("fullName")}
          />
        </Field>

        <Field id="signup-email" label="Email" error={errors.email?.message}>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={
              errors.email ? fieldMessageId("signup-email") : undefined
            }
            {...register("email")}
          />
        </Field>

        <Field
          id="signup-phone"
          label="Phone"
          error={errors.phone?.message}
          description={errors.phone ? undefined : "Bangladesh number, e.g. +8801712345678"}
        >
          <Input
            id="signup-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+8801712345678"
            aria-invalid={!!errors.phone}
            aria-describedby={fieldMessageId("signup-phone")}
            {...register("phone")}
          />
        </Field>

        <Field
          id="signup-password"
          label="Password"
          error={errors.password?.message}
          description={
            errors.password ? undefined : "At least 12 characters, with a letter and a number"
          }
        >
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            aria-invalid={!!errors.password}
            aria-describedby={fieldMessageId("signup-password")}
            {...register("password")}
          />
        </Field>

        <Button type="submit" fullWidth loading={isSubmitting}>
          Create account
        </Button>
      </form>

      {onSwitchToLogin ? (
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-primary hover:underline"
          >
            Log in
          </button>
        </p>
      ) : null}
    </div>
  );
}
