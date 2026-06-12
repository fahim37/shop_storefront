"use client";

import * as React from "react";
import {
  Home,
  MapPin,
  Pencil,
  Plus,
  Store,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/http";
import {
  useAddresses,
  useDeleteAddress,
  useSetDefaultAddress,
} from "@/lib/api/account";
import { AddressFormDialog } from "@/components/account/address-form-dialog";
import type { Address } from "@/lib/api/types";

function labelIcon(label: string | null): LucideIcon {
  const l = (label ?? "").toLowerCase();
  if (l === "office") return Store;
  if (l === "home") return Home;
  return MapPin;
}

function AddressCard({
  address,
  onEdit,
}: {
  address: Address;
  onEdit: (a: Address) => void;
}) {
  const del = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const Icon = labelIcon(address.label);

  const locationLine = [
    address.streetAddress,
    address.unionName,
    address.upazila,
    address.district,
    address.postcode,
  ]
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(", ");

  async function handleDelete() {
    if (del.isPending) return;
    if (
      !window.confirm(
        "Delete this address? This action cannot be undone.",
      )
    )
      return;
    try {
      await del.mutateAsync(address.id);
      toast.success("Address deleted");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not delete address",
      );
    }
  }

  async function handleSetDefault() {
    if (setDefault.isPending || address.isDefault) return;
    try {
      await setDefault.mutateAsync(address.id);
      toast.success("Default address updated");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not set default",
      );
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] transition-colors",
        address.isDefault ? "border-primary" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-blue-soft text-primary">
            <Icon className="size-[18px]" />
          </span>
          <Badge variant="muted" size="sm">
            {address.label ?? "Address"}
          </Badge>
          {address.isDefault && (
            <Badge variant="primary" size="sm">
              Default
            </Badge>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate font-display text-sm font-extrabold text-ink">
          {address.recipientName ?? "—"}
          {address.recipientPhone && (
            <span className="font-sans font-medium text-sub">
              {" · "}
              {address.recipientPhone}
            </span>
          )}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-sub">
          {locationLine}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button
          variant="soft"
          size="sm"
          onClick={() => onEdit(address)}
          className="gap-1.5"
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
        {!address.isDefault && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetDefault}
            loading={setDefault.isPending}
          >
            Set default
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          loading={del.isPending}
          className="ml-auto gap-1.5 text-red hover:bg-red/10"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export default function AddressesPage() {
  const { data: addresses, isLoading, isError, refetch } = useAddresses();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Address | undefined>(undefined);

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (a: Address) => {
    setEditing(a);
    setDialogOpen(true);
  };

  // Keep the default address first, then most-recent edits.
  const sorted = React.useMemo(() => {
    if (!addresses) return [];
    return [...addresses].sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return 0;
    });
  }, [addresses]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink">
            Address book
          </h1>
          <p className="text-sm text-sub">
            Manage where your orders are delivered.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          Add new address
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner className="size-7" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<MapPin className="size-6" />}
            title="Couldn't load your addresses"
            description="Something went wrong. Please try again."
            action={
              <Button variant="outline" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<MapPin className="size-6" />}
            title="No saved addresses yet"
            description="Add a delivery address to speed up checkout."
            action={
              <Button variant="primary" onClick={openCreate} className="gap-1.5">
                <Plus className="size-4" />
                Add new address
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </div>

      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />
    </>
  );
}
