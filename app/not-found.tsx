import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-[var(--shadow-card)]">
        <div className="flex size-14 items-center justify-center rounded-full bg-blue-soft text-primary">
          <Compass className="size-7" strokeWidth={2.2} />
        </div>
        <p className="font-display text-5xl font-extrabold text-primary">404</p>
        <h1 className="font-display text-xl font-extrabold text-ink">
          Page not found
        </h1>
        <p className="max-w-sm text-sm text-sub leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved.
        </p>
        <Button variant="primary" className="mt-2" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
