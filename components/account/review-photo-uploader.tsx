"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useUploadMedia } from "@/lib/api/account";
import { ApiError } from "@/lib/api/http";
import { MediaImage } from "@/components/ui/media-image";
import { cn } from "@/lib/utils";

/**
 * One photo in the review composer. A photo is either:
 *   - "uploading" — file picked, upload in flight (shows a local preview + spinner)
 *   - "uploaded"  — upload done; `mediaId` is a media-asset id to submit/attach
 *   - "existing"  — already attached to the review; `reviewMediaId` deletes it
 */
export interface ReviewPhoto {
  key: string;
  status: "uploading" | "uploaded" | "existing";
  /** Newly-uploaded media-asset id (submit / attach). */
  mediaId?: string;
  /** Existing review_media row id (delete). */
  reviewMediaId?: string;
  /** Existing photo's server path (`/v1/media/:id/card`). */
  url?: string;
  /** Local object URL for instant preview of a new upload. */
  previewUrl?: string;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const genKey = () => `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Drag-and-drop photo uploader for the review dialog. Uploads land in the
 * public R2 bucket via `ownerType: "review"`, immediately (so previews and
 * submit are instant); the parent owns the list and links/unlinks them to the
 * review on save.
 */
export function ReviewPhotoUploader({
  photos,
  onChange,
  max = 6,
  disabled = false,
}: {
  photos: ReviewPhoto[];
  onChange: React.Dispatch<React.SetStateAction<ReviewPhoto[]>>;
  max?: number;
  disabled?: boolean;
}) {
  const upload = useUploadMedia();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const remaining = max - photos.length;

  function acceptFiles(files: File[]) {
    if (disabled) return;
    const slots = max - photos.length;
    if (slots <= 0) {
      toast.error(`You can add up to ${max} photos.`);
      return;
    }
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length < files.length) {
      toast.error("Only image files can be added.");
    }
    for (const file of images.slice(0, slots)) {
      if (file.size > MAX_PHOTO_BYTES) {
        toast.error(`"${file.name}" is larger than 5MB.`);
        continue;
      }
      const key = genKey();
      const previewUrl = URL.createObjectURL(file);
      onChange((prev) => [...prev, { key, status: "uploading", previewUrl }]);
      upload
        .mutateAsync({ file, ownerType: "review" })
        .then((media) => {
          onChange((prev) =>
            prev.map((p) =>
              p.key === key ? { ...p, status: "uploaded", mediaId: media.id } : p,
            ),
          );
        })
        .catch((err) => {
          URL.revokeObjectURL(previewUrl);
          onChange((prev) => prev.filter((p) => p.key !== key));
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't upload that photo.",
          );
        });
    }
  }

  function removePhoto(key: string) {
    onChange((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Add photos</span>
        <span className="text-xs text-faint">
          {photos.length}/{max}
        </span>
      </div>
      <p className="text-xs text-sub">
        Show shoppers the real thing — helps your review stand out (optional).
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          acceptFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "mt-1 flex flex-wrap gap-2.5 rounded-2xl border border-dashed p-3 transition-colors",
          dragOver ? "border-primary bg-blue-soft/40" : "border-border bg-muted/30",
        )}
      >
        {photos.map((p) => (
          <div
            key={p.key}
            className="group relative size-20 overflow-hidden rounded-xl border border-border bg-muted"
          >
            {p.status === "existing" ? (
              <MediaImage src={p.url} alt="Review photo" className="size-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.previewUrl} alt="" className="size-full object-cover" />
            )}

            {p.status === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                <Loader2 className="size-5 animate-spin text-white" />
              </div>
            )}

            <button
              type="button"
              onClick={() => removePhoto(p.key)}
              disabled={disabled}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition-opacity hover:bg-black/80 focus-visible:opacity-100 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <X className="size-3" strokeWidth={2.5} />
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-faint outline-none transition-colors hover:border-primary hover:bg-blue-soft/30 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus className="size-5" strokeWidth={1.8} />
            <span className="text-11 font-semibold">Add</span>
          </button>
        )}

        {photos.length === 0 && remaining > 0 && (
          <p className="flex-1 self-center px-1 text-xs text-faint">
            Drag &amp; drop or tap to add up to {max} photos.
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = "";
            if (files) acceptFiles(Array.from(files));
          }}
        />
      </div>
    </div>
  );
}
