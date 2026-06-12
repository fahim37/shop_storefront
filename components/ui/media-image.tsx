import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl, resolveMediaPath, type MediaVariant } from "@/lib/media";

export interface MediaImageProps {
  /** Media asset id (resolved to `/v1/media/:id/:variant`). */
  mediaId?: string | null;
  /** Or an already-resolved relative/absolute path (e.g. order snapshot). */
  src?: string | null;
  variant?: MediaVariant;
  alt: string;
  /** Classes applied to the rendered <img>/placeholder (fills its parent). */
  className?: string;
  sizes?: string;
}

/**
 * Renders a product/media image from a backend media id (which 302-redirects
 * to a presigned URL). Falls back to a branded gradient tile when there is no
 * image, so grids never show broken thumbnails. Server-compatible (no JS).
 */
export function MediaImage({
  mediaId,
  src,
  variant = "card",
  alt,
  className,
  sizes,
}: MediaImageProps) {
  const url = src ? resolveMediaPath(src) : mediaUrl(mediaId, variant);

  if (!url) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-gradient-to-br from-blue-soft to-surface text-faint",
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <ImageIcon className="size-1/4 max-h-10 max-w-10 opacity-60" strokeWidth={1.4} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      className={cn(
        "size-full object-cover bg-gradient-to-br from-blue-soft to-surface",
        className,
      )}
    />
  );
}
