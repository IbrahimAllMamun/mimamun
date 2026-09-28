"use client";

import Image from "next/image";
import Link from "next/link";
import { CircleAlert, Download, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { MEDIA_KINDS, type AdminMediaDTO, type PageMeta } from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { apiRequest, fieldErrors } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { Dialog, useConfirm } from "../dialog";
import { MediaThumb } from "../media/media-thumb";
import { ACCEPT_TYPES, formatBytes, uploadMedia } from "../media/media-utils";
import { AdminPageHeader, EmptyPanel, ErrorPanel, LoadingRows, relativeTime } from "../page";
import { useToast } from "../toast";
import { useApiQuery, withQuery } from "../use-api";

interface UploadState {
  name: string;
  status: "uploading" | "done" | "failed";
  message?: string;
}

export function MediaPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const list = useApiQuery<AdminMediaDTO[], PageMeta>(withQuery("/api/admin/media", { q, kind, page, pageSize: 30 }));

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploads(files.map((file) => ({ name: file.name, status: "uploading" })));
    let succeeded = 0;
    for (const [index, file] of files.entries()) {
      const result = await uploadMedia(file);
      if (result.ok) succeeded += 1;
      setUploads((current) =>
        current.map((item, i) => (i === index ? { ...item, status: result.ok ? "done" : "failed", message: result.ok ? undefined : result.error.message } : item)),
      );
    }
    if (succeeded) toast.success(`${succeeded} file${succeeded === 1 ? "" : "s"} uploaded`);
    list.reload();
  };

  return (
    <div
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        void uploadFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn("min-h-full rounded-md", dragOver && "outline-2 outline-offset-8 outline-primary outline-dashed")}
    >
      <AdminPageHeader
        title="Media"
        description="Images, PDFs and videos. Uploads are checked by content, images are re-encoded without location data, and files are served with safe headers."
        actions={
          <>
            <input
              ref={input}
              type="file"
              multiple
              accept={ACCEPT_TYPES.any}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                void uploadFiles(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = "";
              }}
            />
            <Button onClick={() => input.current?.click()}>
              <Icon icon={Upload} size={16} /> Upload files
            </Button>
          </>
        }
      />

      <p className="mb-4 text-sm text-ink-3">You can also drop files anywhere on this page. Maximum size and accepted types are set on the server.</p>

      {uploads.length ? (
        <ul aria-live="polite" className="mb-4 space-y-1 rounded-md border border-rule bg-elevated p-3 text-sm">
          {uploads.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3">
              <span className="truncate">{item.name}</span>
              <span className={cn("shrink-0", item.status === "failed" ? "text-error" : item.status === "done" ? "text-success" : "text-ink-3")}>
                {item.status === "uploading" ? "Uploading…" : item.status === "done" ? "Uploaded" : item.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Icon icon={Search} size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, title or alt text"
            aria-label="Search media"
            className="min-h-10 w-full rounded-sm border border-rule-strong bg-elevated pr-3 pl-9 text-sm"
          />
        </div>
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
      </div>

      {list.error ? <ErrorPanel error={list.error} onRetry={list.reload} /> : null}
      {!list.data && list.loading ? <LoadingRows /> : null}
      {list.data && list.data.length === 0 ? (
        <EmptyPanel title={q || kind ? "No files match" : "No files yet"}>
          {q || kind ? "Try another search." : "Upload a portrait, a CV, figures or certificates to use them in your content."}
        </EmptyPanel>
      ) : null}
      {list.data?.length ? (
        <ul className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6", list.loading && "opacity-60")}>
          {list.data.map((media) => (
            <li key={media.id}>
              <button type="button" onClick={() => setOpenId(media.id)} className="w-full space-y-1.5 rounded-sm p-1 text-left hover:bg-muted">
                <MediaThumb media={media} sizes="200px" />
                <span className="block truncate text-sm text-ink">{media.title ?? media.originalName}</span>
                <span className="flex items-center justify-between gap-2 text-xs text-ink-3">
                  <span>{formatBytes(media.sizeBytes)}</span>
                  {media.kind === "image" && !media.alt ? <span className="text-accent">No alt text</span> : <span>{relativeTime(media.createdAt)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {list.meta && list.meta.totalPages > 1 ? (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-ink-3">
            Page {list.meta.page} of {list.meta.totalPages} · {list.meta.total} files
          </span>
          <Button variant="ghost" size="sm" disabled={page >= list.meta.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </nav>
      ) : null}

      {openId ? (
        <MediaDetails
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => list.reload()}
          onDeleted={() => {
            setOpenId(null);
            list.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function MediaDetails({ id, onClose, onChanged, onDeleted }: { id: string; onClose: () => void; onChanged: () => void; onDeleted: () => void }) {
  const detail = useApiQuery<AdminMediaDTO>(`/api/admin/media/${id}`);
  const media = detail.data;
  return (
    <Dialog open onClose={onClose} size="lg" title={media ? (media.title ?? media.originalName) : "File"}>
      {detail.error ? <ErrorPanel error={detail.error} onRetry={detail.reload} /> : null}
      {!media && !detail.error ? <LoadingRows rows={4} /> : null}
      {media ? <MediaDetailsBody key={media.updatedAt} media={media} onChanged={() => { detail.reload(); onChanged(); }} onDeleted={onDeleted} /> : null}
    </Dialog>
  );
}

function MediaDetailsBody({ media, onChanged, onDeleted }: { media: AdminMediaDTO; onChanged: () => void; onDeleted: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const replaceInput = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState({ title: media.title ?? "", altText: media.alt ?? "", caption: media.caption ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const usage = media.usage ?? [];
  const absoluteUrl = typeof window === "undefined" ? media.url : new URL(media.url, window.location.origin).toString();

  const save = async () => {
    setSaving(true);
    const result = await apiRequest("PATCH", `/api/admin/media/${media.id}`, values);
    setSaving(false);
    if (!result.ok) {
      setErrors(fieldErrors(result.error.details));
      toast.error(result.error.message);
      return;
    }
    toast.success("Details saved");
    onChanged();
  };

  const replace = async (file: File | undefined) => {
    if (!file) return;
    setReplacing(true);
    const body = new FormData();
    body.set("file", file);
    const result = await apiRequest("POST", `/api/admin/media/${media.id}/replace`, body);
    setReplacing(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("File replaced everywhere it is used");
    onChanged();
  };

  const remove = async () => {
    const ok = await confirm({ title: "Delete this file?", body: "The file is removed from storage. This cannot be undone.", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    const result = await apiRequest("DELETE", `/api/admin/media/${media.id}`);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("File deleted");
    onDeleted();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        {media.kind === "image" && media.width && media.height ? (
          <Image src={media.url} alt={media.alt} width={media.width} height={media.height} sizes="(min-width: 768px) 24rem, 100vw" className="h-auto w-full rounded-xs border border-rule bg-muted" />
        ) : media.kind === "video" ? (
          <video src={media.url} controls className="w-full rounded-xs border border-rule bg-muted" />
        ) : (
          <MediaThumb media={media} />
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="label">Type</dt>
            <dd className="text-ink-2">{media.mimeType}</dd>
          </div>
          <div>
            <dt className="label">Size</dt>
            <dd className="text-ink-2">{formatBytes(media.sizeBytes)}</dd>
          </div>
          {media.width && media.height ? (
            <div>
              <dt className="label">Dimensions</dt>
              <dd className="text-ink-2">
                {media.width} × {media.height}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="label">Uploaded</dt>
            <dd className="text-ink-2">
              {relativeTime(media.createdAt)}
              {media.uploadedBy ? ` by ${media.uploadedBy}` : ""}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="label">Original name</dt>
            <dd className="break-all text-ink-2">{media.originalName}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={absoluteUrl} label="Copy link" />
          <a href={`${media.url}?download=1`} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm text-primary hover:bg-primary-tint">
            <Icon icon={Download} size={15} /> Download
          </a>
        </div>
      </div>

      <div className="space-y-5">
        <Field label="Title" error={errors.title}>
          {(props) => <Input {...props} value={values.title} maxLength={200} onChange={(event) => setValues({ ...values, title: event.target.value })} />}
        </Field>
        {media.kind === "image" ? (
          <Field label="Alt text" error={errors.altText} description="Describe what the image shows for people who cannot see it. Leave empty only for purely decorative images.">
            {(props) => <Textarea {...props} rows={3} value={values.altText} maxLength={300} onChange={(event) => setValues({ ...values, altText: event.target.value })} />}
          </Field>
        ) : null}
        <Field label="Caption" error={errors.caption}>
          {(props) => <Textarea {...props} rows={2} value={values.caption} maxLength={500} onChange={(event) => setValues({ ...values, caption: event.target.value })} />}
        </Field>
        <Button onClick={() => void save()} pending={saving}>
          Save details
        </Button>

        <section aria-labelledby="usage-title" className="space-y-2 border-t border-rule pt-4">
          <h3 id="usage-title" className="label">
            Used in
          </h3>
          {usage.length ? (
            <ul className="space-y-1 text-sm">
              {usage.map((item) => (
                <li key={`${item.entityType}-${item.entityId}-${item.field}`}>
                  {item.href ? (
                    <Link href={item.href} className="text-primary hover:underline">
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}{" "}
                  <span className="text-ink-3">· {item.field}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Not used anywhere yet.</p>
          )}
        </section>

        <section className="space-y-2 border-t border-rule pt-4">
          <h3 className="label">Replace or delete</h3>
          <p className="text-sm text-ink-3">Replacing keeps the same link, so every page using this file shows the new version.</p>
          <input ref={replaceInput} type="file" accept={ACCEPT_TYPES[media.kind]} className="sr-only" tabIndex={-1} aria-hidden onChange={(event) => void replace(event.currentTarget.files?.[0])} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" pending={replacing} onClick={() => replaceInput.current?.click()}>
              <Icon icon={RefreshCw} size={14} /> Replace file
            </Button>
            <Button variant="danger" size="sm" onClick={() => void remove()} disabled={usage.length > 0}>
              <Icon icon={Trash2} size={14} /> Delete
            </Button>
          </div>
          {usage.length ? (
            <p className="flex items-center gap-1.5 text-xs text-ink-3">
              <Icon icon={CircleAlert} size={13} /> Remove the file from the content above before deleting it.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
