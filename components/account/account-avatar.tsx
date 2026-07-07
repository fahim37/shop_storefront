"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateProfile, useUploadMedia } from "@/lib/api/account";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/http";
import { toast } from "@/components/ui/sonner";
import { initials } from "@/lib/format";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** Clickable initials/photo circle  used on the account page(s) to change the profile photo. */
export function AccountAvatar({
  fullName,
  photoUrl,
  className,
}: {
  fullName: string;
  photoUrl: string | null;
  className?: string;
}) {
  const { refreshProfile } = useAuth();
  const upload = useUploadMedia();
  const update = useUpdateProfile();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const busy = upload.isPending || update.isPending;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    try {
      const media = await upload.mutateAsync({ file, ownerType: "user_avatar" });
      const photo = media.urls.thumbnail ?? media.urls.original;
      await update.mutateAsync({ fullName, photoUrl: photo });
      await refreshProfile();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not update your photo",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={busy}
      className={cn(
        "group relative flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait",
        className,
      )}
      aria-label="Update profile photo"
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="size-full rounded-full object-cover" />
      ) : (
        initials(fullName)
      )}
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <Camera className="size-5 text-white" />
      </span>
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
          <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </span>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
      />
    </button>
  );
}
