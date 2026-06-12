"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Button } from "@/components/ui/button";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = React.useState(false);

  return (
    <AuthCard
      title="Set a new password"
      subtitle={
        token
          ? "Choose a strong password you don't use elsewhere."
          : "This reset link is missing a token."
      }
      footer={
        done ? (
          <Link href="/" className="font-medium text-primary hover:underline">
            Return to the storefront
          </Link>
        ) : (
          <Link href="/" className="font-medium text-primary hover:underline">
            Back to home
          </Link>
        )
      }
    >
      {token ? (
        <ResetPasswordForm token={token} onSuccess={() => setDone(true)} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Request a new password reset link to continue.
          </p>
          <Link href="/">
            <Button variant="outline" fullWidth>
              Go to storefront
            </Button>
          </Link>
        </div>
      )}
    </AuthCard>
  );
}

/**
 * Standalone password-reset page. Reads the token from ?token= in the URL and
 * posts {token, newPassword} via ResetPasswordForm.
 */
export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-8 shadow-sm">
        <React.Suspense
          fallback={
            <p className="text-center text-sm text-muted-foreground">Loading…</p>
          }
        >
          <ResetPasswordContent />
        </React.Suspense>
      </div>
    </main>
  );
}
