"use client";

import { ImagePlus, X } from "lucide-react";
import { useState } from "react";
import type { AdminMediaDTO, MediaAccept } from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { MediaLibraryDialog, UploadButton } from "../media/media-library";
import { MediaThumb } from "../media/media-thumb";
import { formatBytes } from "../media/media-utils";
import { useApiQuery } from "../use-api";

/** Picks a file from the media library (or uploads one) and stores its id. */
export function MediaField({
  value,
  onChange,
  accept = "any",
  describedBy,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  accept?: MediaAccept;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<AdminMediaDTO | null>(null);
  const needsLookup = Boolean(value) && picked?.id !== value;
  const lookup = useApiQuery<AdminMediaDTO>(needsLookup ? `/api/admin/media/${value}` : null);
  const media = picked?.id === value ? picked : lookup.data;

  const select = (item: AdminMediaDTO) => {
    setPicked(item);
    onChange(item.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-3" aria-describedby={describedBy}>
      {value && media ? (
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xs border border-rule bg-surface p-2">
          <MediaThumb media={media} className="size-16 shrink-0" sizes="64px" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate text-ink">{media.title ?? media.originalName}</p>
            <p className="text-xs text-ink-3">
              {media.mimeType} · {formatBytes(media.sizeBytes)}
              {media.width && media.height ? ` · ${media.width}×${media.height}` : ""}
            </p>
            {media.kind === "image" && !media.alt ? <p className="text-xs text-accent">No alt text yet — add it in the media library.</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
            Change
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} aria-label="Remove file">
            <Icon icon={X} size={14} />
          </Button>
        </div>
      ) : value && lookup.error ? (
        <div className="flex flex-1 items-center justify-between gap-3 rounded-xs border border-error/40 bg-error-tint px-3 py-2 text-sm">
          <span>The selected file no longer exists.</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Clear
          </Button>
        </div>
      ) : value ? (
        <p className="text-sm text-ink-3">Loading file…</p>
      ) : (
        <>
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            <Icon icon={ImagePlus} size={16} /> Choose from library
          </Button>
          <UploadButton accept={accept} onUploaded={select} label="Upload" />
        </>
      )}
      <MediaLibraryDialog open={open} onClose={() => setOpen(false)} onSelect={select} accept={accept} />
    </div>
  );
}
