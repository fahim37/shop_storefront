"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  KeyRound,
  Mail,
  Phone,
  User,
  VenusAndMars,
} from "lucide-react";
import { useMe, useUpdateProfile } from "@/lib/api/account";
import { ApiError } from "@/lib/api/http";
import { formatDate } from "@/lib/format";
import type { Me } from "@/lib/api/types";
import { AccountAvatar } from "@/components/account/account-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";

const PLACEHOLDER_PHOTO = "https://gcl.com.bd/avatar.png";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

function genderLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return GENDER_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/* --------------------------------------------------------------------- */
/* Read-only info row                                                    */
/* --------------------------------------------------------------------- */

function InfoRow({
  icon: Icon,
  label,
  value,
  verified,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-11 font-extrabold uppercase tracking-wide text-faint">
          {label}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="break-words text-sm font-bold text-ink">{value}</p>
          {verified ? (
            <Badge variant="success" size="sm">
              <BadgeCheck className="size-3" />
              Verified
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Edit profile dialog                                                   */
/* --------------------------------------------------------------------- */

function EditProfileDialog({ me }: { me: Me }) {
  const update = useUpdateProfile();
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState(me.profile?.fullName ?? "");
  const [gender, setGender] = React.useState(me.profile?.gender ?? "");
  const [dateOfBirth, setDateOfBirth] = React.useState(
    me.profile?.dateOfBirth?.slice(0, 10) ?? "",
  );

  function handleOpenChange(next: boolean) {
    // Re-seed the controlled form from the current profile each time it opens.
    if (next) {
      setFullName(me.profile?.fullName ?? "");
      setGender(me.profile?.gender ?? "");
      setDateOfBirth(me.profile?.dateOfBirth?.slice(0, 10) ?? "");
    }
    setOpen(next);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) {
      toast.error("Full name is required");
      return;
    }
    try {
      await update.mutateAsync({
        fullName: name,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        photoUrl: me.profile?.photoUrl ?? PLACEHOLDER_PHOTO,
      });
      toast.success("Profile updated", {
        description: "Your personal information has been saved.",
      });
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not update your profile",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="soft" size="sm" onClick={() => handleOpenChange(true)}>
        Edit profile
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your name and personal details. Email and phone are managed
            separately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Field id="fullName" label="Full name">
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Fahim Ahmed"
              autoComplete="name"
              required
            />
          </Field>

          <Field id="gender" label="Gender">
            <Select value={gender || undefined} onValueChange={setGender}>
              <SelectTrigger id="gender" className="w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="dateOfBirth" label="Date of birth">
            <DatePicker
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              placeholder="Select your date of birth"
              max={new Date()}
              defaultMonth={new Date(2000, 0)}
            />
          </Field>

          <DialogFooter className="mt-1">
            <Button
              type="button"
              variant="soft"
              onClick={() => setOpen(false)}
              disabled={update.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={update.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------------- */
/* Loading skeleton                                                      */
/* --------------------------------------------------------------------- */

function InfoRowSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="mt-0.5 size-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

function PersonalInfoSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="h-40 rounded-2xl" />
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <InfoRowSkeleton key={i} />
          ))}
        </div>
      </div>
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Personal information (rendered at /account/profile)                   */
/* --------------------------------------------------------------------- */

export function ProfileOverview() {
  const { data: me, isLoading, isError } = useMe();

  if (isLoading) {
    return <PersonalInfoSkeleton />;
  }

  if (isError || !me) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-bold text-ink">
          We couldn&apos;t load your account
        </p>
        <p className="mt-1 text-sm text-sub">
          Please refresh the page or try again in a moment.
        </p>
      </div>
    );
  }

  const fullName = me.profile?.fullName?.trim() || "Your account";
  const fullyVerified = me.isEmailVerified && me.isPhoneVerified;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
        Personal information
      </h1>

      {/* Profile card ---------------------------------------------------- */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="relative h-24 bg-linear-to-br from-navy via-blue-deep to-[oklch(0.32_0.11_262)]">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-amber/12"
          />
        </div>
        <div className="relative px-5 pb-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="flex items-end gap-4">
              <AccountAvatar
                fullName={fullName}
                photoUrl={me.profile?.photoUrl ?? null}
                className="-mt-12 size-[84px] rounded-full bg-blue-deep font-display text-3xl font-extrabold text-amber ring-4 ring-card"
              />
              <div className="min-w-0 pb-0.5">
                <p className="truncate font-display text-lg font-extrabold text-ink">
                  {fullName}
                </p>
                <p className="mt-0.5 truncate text-13 text-sub">{me.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {fullyVerified && (
                <Badge variant="success" size="md" className="hidden sm:inline-flex">
                  <BadgeCheck className="size-3.5" />
                  Verified
                </Badge>
              )}
              <EditProfileDialog me={me} />
            </div>
          </div>
        </div>
      </section>

      {/* Details grid ---------------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-6">
          <InfoRow icon={User} label="Full name" value={fullName} />
          <InfoRow
            icon={Mail}
            label="Email"
            value={me.email}
            verified={me.isEmailVerified}
          />
          <InfoRow
            icon={Phone}
            label="Phone"
            value={me.phone || "—"}
            verified={me.isPhoneVerified}
          />
          <InfoRow
            icon={VenusAndMars}
            label="Gender"
            value={genderLabel(me.profile?.gender)}
          />
          <InfoRow
            icon={CalendarDays}
            label="Date of birth"
            value={
              me.profile?.dateOfBirth ? formatDate(me.profile.dateOfBirth) : "—"
            }
          />
        </div>
      </section>

      {/* Password & security -------------------------------------------- */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-soft text-primary">
            <KeyRound className="size-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink">Password &amp; security</p>
            <p className="mt-0.5 text-13 text-sub">
              Reset your password through a secure email link.
            </p>
          </div>
        </div>
        <Button asChild variant="soft" size="sm">
          <Link href="/account/password">Change password</Link>
        </Button>
      </section>
    </div>
  );
}
