"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface the error for client-side diagnostics.
    console.error(error);
  }, [error]);

  return (
    <div className="wrap flex min-h-[50vh] items-center justify-center py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-[var(--shadow-card)]">
        <div className="flex size-14 items-center justify-center rounded-full bg-blue-soft text-primary">
          <AlertTriangle className="size-7" strokeWidth={2.2} />
        </div>
        <h1 className="font-display text-xl font-extrabold text-ink">
          Something went wrong
        </h1>
        <p className="max-w-sm text-sm text-sub leading-relaxed">
          An unexpected error occurred while loading this page. You can try again
          or head back to the homepage.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="soft" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
