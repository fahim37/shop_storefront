"use client";

import * as React from "react";
import { BellRing, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToggleFollowStore } from "@/lib/api/engagement";

/**
 * Follow/unfollow toggle for the store header. Optimistic — flips instantly;
 * guests get the auth modal via `requireAuth` inside the hook.
 *
 * The follower count renders server-side (ISR); we adjust it locally by ±1
 * relative to the user's own toggle so the number tracks their action
 * without refetching the whole page.
 */
export function FollowStoreButton({
  vendorId,
  initialFollowers,
  className,
}: {
  vendorId: string;
  initialFollowers: number;
  className?: string;
}) {
  const { isFollowing, toggle } = useToggleFollowStore(vendorId);
  // Whether the server-rendered count already includes this user's follow is
  // unknowable client-side; the ±1 is best-effort and self-corrects on the
  // next ISR pass.
  const [baseline] = React.useState(isFollowing);
  const delta = isFollowing === baseline ? 0 : isFollowing ? 1 : -1;
  const followers = Math.max(0, initialFollowers + delta);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFollowing}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
        isFollowing
          ? "bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25"
          : "bg-white text-navy hover:bg-white/90",
        className,
      )}
    >
      {isFollowing ? (
        <>
          <BellRing className="size-4" strokeWidth={2.2} /> Following
        </>
      ) : (
        <>
          <Plus className="size-4" strokeWidth={2.6} /> Follow
        </>
      )}
      <span className={cn("text-13 font-semibold", isFollowing ? "text-white/70" : "text-navy/60")}>
        {Intl.NumberFormat("en", { notation: "compact" }).format(followers)}
      </span>
    </button>
  );
}
