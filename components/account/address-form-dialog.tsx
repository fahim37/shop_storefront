"use client";

import * as React from "react";
import { BadgeCheck, Home, Store, MapPin, Smartphone } from "lucide-react";
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

type FieldKey = "recipientName" | "district" | "streetAddress";

const EMPTY: FormState = {
  recipientName: "",
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

  // Reset the form whenever the dialog opens (or `initial` changes while open),
  // seeding edit values. Done during render by tracking the previous open state
  // and `initial` reference, so the seeded values are present on first paint.
  const [seededFor, setSeededFor] = React.useState<{
    open: boolean;
    initial: Address | undefined;
  }>({ open, initial });
  if (open && (!seededFor.open || seededFor.initial !== initial)) {
    setSeededFor({ open, initial });
    setForm(initial ? fromAddress(initial) : EMPTY);
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
    if (!form.district.trim()) next.district = "District is required.";
    if (!form.streetAddress.trim())
      next.streetAddress = "Full address is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    // A verified account phone is the delivery contact + canonical identity —
    // it's mandatory before an address can be saved.
    if (!verifiedPhone) {
      toast.error("Verify your mobile number to save an address.");
      setVerifyOpen(true);
      return;
    }
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const input: AddressInput = {
      label: form.label,
      recipientName: form.recipientName.trim(),
      recipientPhone: verifiedPhone,
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

          {/* Verified mobile number — the delivery contact + account identity */}
          <div className="flex flex-col gap-1.5">
            <Label>Mobile number</Label>
            {verifiedPhone ? (
              <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-muted px-3.5 py-2.5">
                <Smartphone className="size-4 shrink-0 text-faint" />
                <span className="flex-1 text-sm font-bold text-ink">
                  {verifiedPhone}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2 py-0.5 text-[11px] font-extrabold text-green">
                  <BadgeCheck className="size-3.5" />
                  Verified
                </span>
                <button
                  type="button"
                  onClick={() => setVerifyOpen(true)}
                  className="text-[12px] font-bold text-primary hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setVerifyOpen(true)}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-dashed border-primary/40 bg-blue-soft/50 px-3.5 py-3 text-left transition-colors hover:bg-blue-soft"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-soft text-primary">
                  <Smartphone className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink">
                    Verify your mobile number
                  </span>
                  <span className="block text-[12px] text-sub">
                    Required — we send a one-time code by SMS.
                  </span>
                </span>
                <span className="shrink-0 text-[12px] font-extrabold text-primary">
                  Verify
                </span>
              </button>
            )}
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
        initialPhone={verifiedPhone ?? ""}
      />
    </Dialog>
  );
}
