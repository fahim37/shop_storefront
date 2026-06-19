"use client";

import * as React from "react";
import { Home, Store, MapPin } from "lucide-react";
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
import { LocationPicker } from "@/components/account/location-picker";
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

interface FormState {
  recipientName: string;
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

type FieldKey =
  | "recipientName"
  | "division"
  | "district"
  | "upazila"
  | "postcode"
  | "streetAddress";

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
    recipientPhone: a.recipientPhone ?? "",
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

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<Partial<Record<FieldKey, string>>>(
    {},
  );

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
    if (!form.division.trim()) next.division = "Division is required.";
    if (!form.district.trim()) next.district = "District is required.";
    if (!form.upazila.trim()) next.upazila = "Upazila is required.";
    if (!/^\d{4}$/.test(form.postcode.trim()))
      next.postcode = "Postcode must be 4 digits.";
    if (!form.streetAddress.trim())
      next.streetAddress = "Street address is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const input: AddressInput = {
      label: form.label,
      recipientName: form.recipientName.trim(),
      recipientPhone: form.recipientPhone.trim() || undefined,
      division: form.division.trim(),
      district: form.district.trim(),
      upazila: form.upazila.trim(),
      unionName: form.unionName.trim() || undefined,
      postcode: form.postcode.trim(),
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

          <div className="grid gap-4 sm:grid-cols-2">
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

            <Field id="recipientPhone" label="Phone (optional)">
              <Input
                id="recipientPhone"
                type="tel"
                inputMode="tel"
                value={form.recipientPhone}
                onChange={(e) => set("recipientPhone", e.target.value)}
                placeholder="+8801XXXXXXXXX"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="division" label="Division" error={errors.division}>
              <Input
                id="division"
                value={form.division}
                onChange={(e) => set("division", e.target.value)}
                placeholder="e.g. Dhaka"
                aria-invalid={!!errors.division}
                aria-describedby={
                  errors.division ? fieldMessageId("division") : undefined
                }
              />
            </Field>

            <Field id="district" label="District" error={errors.district}>
              <Input
                id="district"
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                placeholder="e.g. Gazipur"
                aria-invalid={!!errors.district}
                aria-describedby={
                  errors.district ? fieldMessageId("district") : undefined
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="upazila" label="Upazila" error={errors.upazila}>
              <Input
                id="upazila"
                value={form.upazila}
                onChange={(e) => set("upazila", e.target.value)}
                placeholder="e.g. Tongi"
                aria-invalid={!!errors.upazila}
                aria-describedby={
                  errors.upazila ? fieldMessageId("upazila") : undefined
                }
              />
            </Field>

            <Field id="unionName" label="Union / Area (optional)">
              <Input
                id="unionName"
                value={form.unionName}
                onChange={(e) => set("unionName", e.target.value)}
                placeholder="e.g. Auchpara"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="postcode" label="Postcode" error={errors.postcode}>
              <Input
                id="postcode"
                inputMode="numeric"
                maxLength={4}
                value={form.postcode}
                onChange={(e) =>
                  set("postcode", e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="1234"
                aria-invalid={!!errors.postcode}
                aria-describedby={
                  errors.postcode ? fieldMessageId("postcode") : undefined
                }
              />
            </Field>
          </div>

          <Field
            id="streetAddress"
            label="Street address"
            error={errors.streetAddress}
          >
            <textarea
              id="streetAddress"
              value={form.streetAddress}
              onChange={(e) => set("streetAddress", e.target.value)}
              placeholder="House / road / landmark"
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
    </Dialog>
  );
}
