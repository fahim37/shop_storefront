"use client";

import { Toaster as SonnerToaster } from "sonner";

/** App toast host, styled to the brand tokens. Mounted once in Providers. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-card !text-foreground !shadow-[var(--shadow-pop)] !font-sans",
          title: "!font-bold !text-sm",
          description: "!text-muted-foreground !text-xs",
          actionButton: "!bg-primary !text-primary-foreground !rounded-lg",
          success: "!text-foreground",
          error: "!text-foreground",
        },
      }}
    />
  );
}

export { toast } from "sonner";
