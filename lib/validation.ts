import { z } from "zod";

/**
 * Shared validation rules. These MUST mirror the backend exactly:
 * - email: valid + lowercased
 * - phone: Bangladesh pattern ^\+8801[3-9]\d{8}$
 * - password: min 12 chars, at least one letter AND one digit
 *   (the Figma's "6 characters" hint is intentionally ignored)
 * - otp / 2fa code: exactly 6 digits
 */

/** Bangladesh mobile number: +8801 then a digit 3-9 then 8 more digits. */
export const BD_PHONE_REGEX = /^\+8801[3-9]\d{8}$/;

/**
 * Reduce any BD phone input to its 10-digit national core (1XXXXXXXXX): keep
 * digits, drop a leading 880 / 0 (so 01…, 8801…, +8801… all collapse to the
 * same core), then cap at 10 digits so junk can't be typed.
 */
export function toBdNational(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

/** A valid BD mobile core: 1, an operator digit 3–9, then 8 more digits. */
export function isValidBdNational(national: string): boolean {
  return /^1[3-9]\d{8}$/.test(national);
}

/** National core → E.164 (+8801XXXXXXXXX). Assumes a valid 10-digit core. */
export function bdNationalToE164(national: string): string {
  return `+880${national}`;
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .regex(BD_PHONE_REGEX, "Enter a valid Bangladesh number, e.g. +8801712345678");

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .refine((value) => /[A-Za-z]/.test(value), {
    message: "Password must contain at least one letter",
  })
  .refine((value) => /\d/.test(value), {
    message: "Password must contain at least one number",
  });

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Full name is required")
  .max(120, "Full name is too long");

/** Login/reset identifier: either a valid email or a valid +880 phone. */
export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Email or phone is required")
  .refine(
    (value) =>
      z.string().email().safeParse(value).success ||
      BD_PHONE_REGEX.test(value),
    { message: "Enter a valid email or Bangladesh phone number" },
  )
  .transform((value) =>
    value.includes("@") ? value.toLowerCase() : value,
  );

/** Exactly 6 numeric digits (OTP and 2FA codes share this shape). */
export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

/* -------------------------------------------------------------------------- */
/* Form schemas                                                               */
/* -------------------------------------------------------------------------- */

export const signupSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});
export type SignupFormValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const twoFactorSchema = z.object({
  code: otpSchema,
});
export type TwoFactorFormValues = z.infer<typeof twoFactorSchema>;

export const otpFormSchema = z.object({
  code: otpSchema,
});
export type OtpFormValues = z.infer<typeof otpFormSchema>;

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
