"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
} from "lucide-react";
import {
  useAddresses,
  useMe,
  useUpdateProfile,
} from "@/lib/api/account";
import { ApiError } from "@/lib/api/http";
import { formatDate } from "@/lib/format";
import type { Address, Me } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
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
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">
          {label}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
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
      <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
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
            <Select
              value={gender || undefined}
              onValueChange={setGender}
            >
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
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
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
/* Address summary                                                       */
/* --------------------------------------------------------------------- */

function AddressMiniCard({ address }: { address: Address }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        {address.label ? (
          <Badge variant="primary" size="sm">
            {address.label}
          </Badge>
        ) : null}
        {address.isDefault ? (
          <Badge variant="accent" size="sm">
            Default
          </Badge>
        ) : null}
      </div>
      {address.recipientName ? (
        <p className="text-sm font-bold text-ink">{address.recipientName}</p>
      ) : null}
      <p className="text-sm leading-relaxed text-sub">
        {address.streetAddress}
        <br />
        {[address.upazila, address.district].filter(Boolean).join(", ")}
        {address.postcode ? ` - ${address.postcode}` : ""}
      </p>
    </div>
  );
}

function AddressBookCard() {
  const { data: addresses, isLoading, isError } = useAddresses();

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Address book</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/account/addresses">Manage addresses</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-5 text-primary" />
          </div>
        ) : isError ? (
          <p className="py-4 text-sm text-sub">
            We couldn&apos;t load your addresses. Please try again.
          </p>
        ) : !addresses || addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-blue-soft text-primary">
              <MapPin className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">No addresses yet</p>
              <p className="mt-0.5 text-sm text-sub">
                Add a delivery address to check out faster.
              </p>
            </div>
            <Button asChild variant="primary" size="sm">
              <Link href="/account/addresses">
                <Plus className="size-4" />
                Add address
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.slice(0, 2).map((address) => (
              <AddressMiniCard key={address.id} address={address} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------------- */
/* Page                                                                  */
/* --------------------------------------------------------------------- */

export default function AccountPersonalInfoPage() {
  const { data: me, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-bold text-ink">
          We couldn&apos;t load your account
        </p>
        <p className="mt-1 text-sm text-sub">
          Please refresh the page or try again in a moment.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Personal information</CardTitle>
          <EditProfileDialog me={me} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <InfoRow
              icon={User}
              label="Full name"
              value={me.profile?.fullName?.trim() || "—"}
            />
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
              icon={User}
              label="Gender"
              value={genderLabel(me.profile?.gender)}
            />
            <InfoRow
              icon={CalendarDays}
              label="Date of birth"
              value={
                me.profile?.dateOfBirth
                  ? formatDate(me.profile.dateOfBirth)
                  : "—"
              }
            />
          </div>
        </CardContent>
      </Card>

      <AddressBookCard />
    </div>
  );
}
