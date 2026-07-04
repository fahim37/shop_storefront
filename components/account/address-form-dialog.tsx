"use client";

import * as React from "react";
import { BadgeCheck, Home, Store, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, fieldMessageId } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/http";
import { isMapsEnabled } from "@/lib/config";
import {
  bdNationalToE164,
  isValidBdNational,
  toBdNational,
} from "@/lib/validation";
import { useCreateAddress, useUpdateAddress } from "@/lib/api/account";
import { useAuth } from "@/lib/auth/auth-context";
import { LocationPicker } from "@/components/account/location-picker";
import { PhoneVerifyDialog } from "@/components/account/phone-verify-dialog";
import type { ParsedAddress } from "@/lib/maps/address";
import type { Address, AddressInput } from "@/lib/api/types";

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When present, the dialog edits this address; otherwise it creates a new one. */
  initial?: Address;
}

const LABEL_OPTIONS = [
  { value: "Home", icon: Home },
  { value: "Office", icon: Store },
  { value: "Other", icon: MapPin },
] as const;

type LabelValue = (typeof LABEL_OPTIONS)[number]["value"];

// Only `recipientName`, `district` and `streetAddress` are shown to the
// customer now. `division`/`upazila`/`unionName`/`postcode` stay in state so the
// map picker can still fill them silently (they're optional on the backend),
// but there are no visible inputs for them.
interface FormState {
  recipientName: string;
  /** BD national core (1XXXXXXXXX). The +880 prefix is fixed in the UI. */
  recipientPhone: string;
  label: LabelValue;
  division: string;
  district: string;
  upazila: string;
  unionName: string;
  postcode: string;
  streetAddress: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

type FieldKey = "recipientName" | "recipientPhone" | "district" | "streetAddress";

const EMPTY: FormState = {
  recipientName: "",
  recipientPhone: "",
  label: "Home",
  division: "",
  district: "",
  upazila: "",
  unionName: "",
  postcode: "",
  streetAddress: "",
  latitude: null,
  longitude: null,
  isDefault: false,
};

function fromAddress(a: Address): FormState {
  const label = (LABEL_OPTIONS.find((o) => o.value === a.label)?.value ??
    "Other") as LabelValue;
  return {
    recipientName: a.recipientName ?? "",
    recipientPhone: toBdNational(a.recipientPhone ?? ""),
    label,
    division: a.division ?? "",
    district: a.district ?? "",
    upazila: a.upazila ?? "",
    unionName: a.unionName ?? "",
    postcode: a.postcode ?? "",
    streetAddress: a.streetAddress ?? "",
    latitude: a.latitude != null ? Number(a.latitude) : null,
    longitude: a.longitude != null ? Number(a.longitude) : null,
    isDefault: a.isDefault,
  };
}

export function AddressFormDialog({
  open,
  onOpenChange,
  initial,
}: AddressFormDialogProps) {
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const saving = create.isPending || update.isPending;
  const { user } = useAuth();
  const verifiedPhone = user?.verifiedPhone ?? null;

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<Partial<Record<FieldKey, string>>>(
    {},
  );
  const [verifyOpen, setVerifyOpen] = React.useState(false);

  // The typed contact number matches the account's verified phone → we can
  // badge it as verified (and no confirmation call is needed for it).
  const isVerifiedNumber =
    !!verifiedPhone &&
    form.recipientPhone.length > 0 &&
    form.recipientPhone === toBdNational(verifiedPhone);

  // Reset the form whenever the dialog opens (or `initial` changes while open),
  // seeding edit values. Done during render by tracking the previous open state
  // and `initial` reference, so the seeded values are present on first paint.
  const [seededFor, setSeededFor] = React.useState<{
    open: boolean;
    initial: Address | undefined;
  }>({ open, initial });
  if (open && (!seededFor.open || seededFor.initial !== initial)) {
    setSeededFor({ open, initial });
    // New address: prefill the contact number with the account's verified
    // phone (if any) as a sensible default — the customer can change it.
    setForm(
      initial
        ? fromAddress(initial)
        : { ...EMPTY, recipientPhone: toBdNational(verifiedPhone ?? "") },
    );
    setErrors({});
  } else if (!open && seededFor.open) {
    setSeededFor({ open, initial });
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Map picker resolved a location → prefill the editable fields + coords.
  // Only overwrite a field when the map gave us a confident value.
  const applyPicked = React.useCallback((p: ParsedAddress) => {
    setForm((prev) => ({
      ...prev,
      division: p.division || prev.division,
      district: p.district || prev.district,
      upazila: p.upazila || prev.upazila,
      unionName: p.unionName || prev.unionName,
      postcode: /^\d{4}$/.test(p.postcode) ? p.postcode : prev.postcode,
      streetAddress: p.streetAddress || prev.streetAddress,
      latitude: p.latitude,
      longitude: p.longitude,
    }));
    setErrors({});
  }, []);

  function validate(): boolean {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!form.recipientName.trim()) next.recipientName = "Recipient name is required.";
    if (!form.recipientPhone.trim())
      next.recipientPhone = "Mobile number is required.";
    else if (!isValidBdNational(form.recipientPhone))
      next.recipientPhone = "Enter a valid Bangladeshi mobile number.";
    if (!form.district.trim()) next.district = "District is required.";
    if (!form.streetAddress.trim())
      next.streetAddress = "Full address is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    // The contact number is required (we deliver + confirm by phone), but it
    // does NOT have to be verified — an unverified number is accepted and the
    // order is confirmed by a call. Verifying is offered as a convenience.
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const input: AddressInput = {
      label: form.label,
      recipientName: form.recipientName.trim(),
      recipientPhone: bdNationalToE164(form.recipientPhone),
      division: form.division.trim() || undefined,
      district: form.district.trim(),
      upazila: form.upazila.trim() || undefined,
      unionName: form.unionName.trim() || undefined,
      postcode: form.postcode.trim() || undefined,
      streetAddress: form.streetAddress.trim(),
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
      isDefault: form.isDefault,
    };

    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, input });
        toast.success("Address updated");
      } else {
        await create.mutateAsync(input);
        toast.success("Address added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not save address",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {initial ? "Edit address" : "Add new address"}
          </DialogTitle>
          <DialogDescription>
            Where should we deliver your orders?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {isMapsEnabled && (
            <div className="flex flex-col gap-1.5">
              <Label>Find your location</Label>
              <LocationPicker
                value={
                  form.latitude != null && form.longitude != null
                    ? { lat: form.latitude, lng: form.longitude }
                    : null
                }
                onPick={applyPicked}
              />
            </div>
          )}

          {/* Label chips */}
          <div className="flex flex-col gap-1.5">
            <Label>Label</Label>
            <div className="flex flex-wrap gap-2">
              {LABEL_OPTIONS.map((opt) => {
                const active = form.label === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("label", opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-colors",
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-card text-sub hover:bg-muted",
                    )}
                  >
                    <opt.icon className="size-4" />
                    {opt.value}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile number — the delivery + confirmation contact. Required, but
              verifying it is optional (an unverified number gets a confirmation
              call). We show a Verified badge when it matches the account phone. */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="recipientPhone">Mobile number</Label>
              {isVerifiedNumber ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-extrabold text-green">
                  <BadgeCheck className="size-3.5" />
                  Verified
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setVerifyOpen(true)}
                  className="text-[12px] font-bold text-primary hover:underline"
                >
                  Verify number
                </button>
              )}
            </div>
            <div
              className={cn(
                "flex h-11 items-center rounded-[var(--radius)] border border-input bg-muted transition-colors",
                "focus-within:border-ring focus-within:bg-background focus-within:ring-2 focus-within:ring-ring",
                errors.recipientPhone &&
                  "border-destructive focus-within:ring-destructive",
              )}
            >
              <span className="select-none pl-3.5 pr-2 text-sm font-bold text-sub">
                +880
              </span>
              <span className="h-5 w-px bg-border" />
              <input
                id="recipientPhone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={form.recipientPhone}
                onChange={(e) => set("recipientPhone", toBdNational(e.target.value))}
                placeholder="1XXXXXXXXX"
                aria-invalid={!!errors.recipientPhone}
                aria-describedby={fieldMessageId("recipientPhone")}
                className="h-full flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {isVerifiedNumber && (
                <BadgeCheck className="mr-3 size-4 shrink-0 text-green" />
              )}
            </div>
            <p
              id={fieldMessageId("recipientPhone")}
              className={cn(
                "text-xs",
                errors.recipientPhone ? "text-destructive" : "text-faint",
              )}
            >
              {errors.recipientPhone
                ? errors.recipientPhone
                : isVerifiedNumber
                  ? "This number is verified on your account."
                  : "We'll call this number to confirm your order — verify it to skip the call."}
            </p>
          </div>

          <Field
            id="recipientName"
            label="Recipient name"
            error={errors.recipientName}
          >
            <Input
              id="recipientName"
              value={form.recipientName}
              onChange={(e) => set("recipientName", e.target.value)}
              placeholder="Full name"
              aria-invalid={!!errors.recipientName}
              aria-describedby={
                errors.recipientName ? fieldMessageId("recipientName") : undefined
              }
            />
          </Field>

          <Field id="district" label="District" error={errors.district}>
            <Input
              id="district"
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
              placeholder="e.g. Dhaka"
              aria-invalid={!!errors.district}
              aria-describedby={
                errors.district ? fieldMessageId("district") : undefined
              }
            />
          </Field>

          <Field
            id="streetAddress"
            label="Full address"
            error={errors.streetAddress}
          >
            <textarea
              id="streetAddress"
              value={form.streetAddress}
              onChange={(e) => set("streetAddress", e.target.value)}
              placeholder="House / road / area / landmark"
              rows={3}
              aria-invalid={!!errors.streetAddress}
              aria-describedby={
                errors.streetAddress ? fieldMessageId("streetAddress") : undefined
              }
              className={cn(
                "flex w-full resize-none rounded-[var(--radius)] border border-input bg-muted px-3.5 py-2.5 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background",
                "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
              )}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-sub">
            <Checkbox
              checked={form.isDefault}
              onCheckedChange={(c) => set("isDefault", c === true)}
            />
            Set as default delivery address
          </label>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="soft"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {initial ? "Save changes" : "Add address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <PhoneVerifyDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        initialPhone={
          form.recipientPhone
            ? bdNationalToE164(form.recipientPhone)
            : verifiedPhone ?? ""
        }
        onVerified={(phone) => set("recipientPhone", toBdNational(phone))}
      />
    </Dialog>
  );
}
