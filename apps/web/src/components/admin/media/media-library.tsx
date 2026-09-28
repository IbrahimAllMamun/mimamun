"use client";

import { Search, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
  MEDIA_KINDS,
  type AdminMediaDTO,
  type MediaAccept,
  type PageMeta,
} from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Dialog } from "../dialog";
import { ErrorPanel, LoadingRows } from "../page";
import { useToast } from "../toast";
import { useApiQuery, withQuery } from "../use-api";
import { MediaThumb } from "./media-thumb";
import { ACCEPT_LABELS, ACCEPT_TYPES, formatBytes, kindFilter, uploadMedia } from "./media-utils";

/** Upload button for one or more files; reports each result. */
export function UploadButton({
  accept = "any",
  multiple = false,
  onUploaded,
  label = "Upload",
  variant = "secondary",
}: {
  accept?: MediaAccept;
  multiple?: boolean;
  onUploaded: (media: AdminMediaDTO) => void;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setPending(true);
    for (const file of Array.from(files)) {
      const result = await uploadMedia(file);
      if (result.ok) onUploaded(result.data);
      else toast.error(`${file.name}: ${result.error.message}`);
    }
    setPending(false);
    if (input.current) input.current.value = "";
  };
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_TYPES[accept]}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void onFiles(event.currentTarget.files)}
      />
      <Button
        type="button"
        variant={variant}
        pending={pending}
        onClick={() => input.current?.click()}
      >
        {pending ? (
          "Uploading…"
        ) : (
          <>
            <Icon icon={Upload} size={16} /> {label}
          </>
        )}
      </Button>
    </>
  );
}

/**
 * Browse, search and upload files, then pick one. Used by media fields in
 * every editor; the kind is fixed when a field only accepts one kind.
 */
export function MediaLibraryDialog({
  open,
  onClose,
  onSelect,
  accept = "any",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (media: AdminMediaDTO) => void;
  accept?: MediaAccept;
}) {
  const fixedKind = kindFilter(accept);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>(fixedKind ?? "");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminMediaDTO | null>(null);
  const query = useApiQuery<AdminMediaDTO[], PageMeta>(
    open ? withQuery("/api/admin/media", { q, kind, page, pageSize: 24 }) : null,
  );

  const choose = (media: AdminMediaDTO) => {
    onSelect(media);
    setSelected(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Choose a file"
      description={`Accepted: ${ACCEPT_LABELS[accept]}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!selected} onClick={() => selected && choose(selected)}>
            Use selected file
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Icon
              icon={Search}
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
            />
            <input
              type="search"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, title or alt text"
              aria-label="Search files"
              className="min-h-10 w-full rounded-sm border border-rule-strong bg-elevated pr-3 pl-9 text-sm"
            />
          </div>
          {fixedKind ? null : (
            <select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value);
                setPage(1);
              }}
              aria-label="File kind"
              className="min-h-10 rounded-sm border border-rule-strong bg-elevated px-2 text-sm"
            >
              <option value="">All kinds</option>
              {MEDIA_KINDS.map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}s
                </option>
              ))}
            </select>
          )}
          <UploadButton accept={accept} onUploaded={(media) => choose(media)} label="Upload new" />
        </div>

        {query.error ? <ErrorPanel error={query.error} onRetry={query.reload} /> : null}
        {!query.data && query.loading ? <LoadingRows rows={4} /> : null}
        {query.data && query.data.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-3">
            No files found. Upload one to use it here.
          </p>
        ) : null}
        {query.data?.length ? (
          <ul
            className={cn(
              "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6",
              query.loading && "opacity-60",
            )}
          >
            {query.data.map((media) => {
              const active = selected?.id === media.id;
              return (
                <li key={media.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(media)}
                    onDoubleClick={() => choose(media)}
                    aria-pressed={active}
                    className={cn(
                      "w-full space-y-1 rounded-sm p-1 text-left outline-offset-2",
                      active ? "bg-primary-tint ring-2 ring-primary" : "hover:bg-muted",
                    )}
                  >
                    <MediaThumb media={media} />
                    <span className="block truncate text-xs text-ink">
                      {media.title ?? media.originalName}
                    </span>
                    <span className="block text-xs text-ink-3">{formatBytes(media.sizeBytes)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {query.meta && query.meta.totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-ink-3">
              Page {query.meta.page} of {query.meta.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= query.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
