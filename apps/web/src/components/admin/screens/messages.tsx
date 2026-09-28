"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Ban, Mail, Reply, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  CONTACT_STATUS_LABELS,
  CONTACT_STATUSES,
  type ContactMessageDTO,
  type ContactStatus,
  type PageMeta,
} from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { useConfirm } from "../dialog";
import { AdminPageHeader, EmptyPanel, ErrorPanel, LoadingRows, Panel, relativeTime } from "../page";
import { useToast } from "../toast";
import { useApiQuery, withQuery } from "../use-api";

const TONES: Record<ContactStatus, "attention" | "neutral" | "positive" | "negative" | "info"> = {
  new: "attention",
  read: "neutral",
  replied: "positive",
  archived: "neutral",
  spam: "negative",
};

export function MessagesPage({ initialStatus }: { initialStatus: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const list = useApiQuery<ContactMessageDTO[], PageMeta>(
    withQuery("/api/admin/messages", { status, q, page }),
  );
  const items = list.data ?? [];

  const bulk = async (action: "read" | "archive" | "spam" | "delete") => {
    if (
      action === "delete" &&
      !(await confirm({
        title: `Delete ${selected.length} message${selected.length === 1 ? "" : "s"}?`,
        body: "Deleted messages cannot be restored.",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    const result = await apiRequest("POST", "/api/admin/messages/bulk", { ids: selected, action });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Messages updated");
    setSelected([]);
    list.reload();
  };

  return (
    <>
      <AdminPageHeader
        title="Messages"
        description="Sent through the contact form. Suspected spam is filed separately and never triggers a notification."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1">
          {["", ...CONTACT_STATUSES].map((value) => (
            <button
              key={value || "all"}
              type="button"
              role="tab"
              aria-selected={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
                setSelected([]);
              }}
              className={cn(
                "min-h-9 rounded-sm px-3 text-sm",
                status === value ? "bg-ink text-paper" : "text-ink-2 hover:bg-muted",
              )}
            >
              {value ? CONTACT_STATUS_LABELS[value as ContactStatus] : "All"}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-56">
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
            placeholder="Search messages"
            aria-label="Search messages"
            className="min-h-10 w-full rounded-sm border border-rule-strong bg-elevated pr-3 pl-9 text-sm"
          />
        </div>
      </div>

      {selected.length ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-primary/40 bg-primary-tint px-3 py-2 text-sm"
        >
          <span className="mr-2 font-medium">{selected.length} selected</span>
          <Button size="sm" variant="secondary" onClick={() => void bulk("read")}>
            Mark read
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void bulk("archive")}>
            Archive
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void bulk("spam")}>
            Mark as spam
          </Button>
          <Button size="sm" variant="danger" onClick={() => void bulk("delete")}>
            Delete
          </Button>
        </div>
      ) : null}

      {list.error ? <ErrorPanel error={list.error} onRetry={list.reload} /> : null}
      {!list.data && list.loading ? <LoadingRows /> : null}
      {list.data && items.length === 0 ? (
        <EmptyPanel title="No messages here">
          Messages from the contact form appear in this inbox.
        </EmptyPanel>
      ) : null}
      {items.length ? (
        <ul
          className={cn(
            "divide-y divide-rule rounded-md border border-rule bg-elevated",
            list.loading && "opacity-60",
          )}
        >
          {items.map((message) => (
            <li
              key={message.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3",
                message.status === "new" && "bg-accent-tint/40",
              )}
            >
              <input
                type="checkbox"
                aria-label={`Select message from ${message.name}`}
                checked={selected.includes(message.id)}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(message.id)
                      ? current.filter((id) => id !== message.id)
                      : [...current, message.id],
                  )
                }
                className="mt-1 size-4 accent-primary"
              />
              <Link href={`/admin/messages/${message.id}`} className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span
                    className={cn(
                      "text-sm",
                      message.status === "new" ? "font-semibold text-ink" : "text-ink",
                    )}
                  >
                    {message.subject}
                  </span>
                  <span className="text-xs text-ink-3">{relativeTime(message.createdAt)}</span>
                </span>
                <span className="block text-xs text-ink-3">
                  {message.name} &lt;{message.email}&gt;
                </span>
                <span className="mt-1 line-clamp-1 block text-sm text-ink-2">
                  {message.message}
                </span>
              </Link>
              <StatusBadge tone={TONES[message.status]}>
                {CONTACT_STATUS_LABELS[message.status]}
              </StatusBadge>
            </li>
          ))}
        </ul>
      ) : null}
      {list.meta && list.meta.totalPages > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-ink-3">
            Page {list.meta.page} of {list.meta.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= list.meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </>
  );
}

export function MessageDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const detail = useApiQuery<ContactMessageDTO>(`/api/admin/messages/${id}`);
  const message = detail.data;

  const setStatus = async (status: ContactStatus) => {
    const result = await apiRequest("PATCH", `/api/admin/messages/${id}`, { status });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`Marked as ${CONTACT_STATUS_LABELS[status].toLowerCase()}`);
    detail.reload();
  };

  const remove = async () => {
    if (
      !(await confirm({
        title: "Delete this message?",
        body: "It cannot be restored.",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    const result = await apiRequest("DELETE", `/api/admin/messages/${id}`);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Message deleted");
    router.push("/admin/messages");
  };

  if (detail.error) return <ErrorPanel error={detail.error} onRetry={detail.reload} />;
  if (!message) return <LoadingRows />;
  const reply = `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;
  return (
    <>
      <AdminPageHeader
        breadcrumbs={[{ label: "Messages", href: "/admin/messages" }, { label: message.subject }]}
        title={message.subject}
        meta={
          <span className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={TONES[message.status]}>
              {CONTACT_STATUS_LABELS[message.status]}
            </StatusBadge>
            <span>Received {new Date(message.createdAt).toLocaleString("en-GB")}</span>
            {message.notifiedAt ? <span>Notification sent</span> : null}
          </span>
        }
        actions={
          <a
            href={reply}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover"
          >
            <Icon icon={Reply} size={16} /> Reply by email
          </a>
        }
      />
      <div className="grid gap-6 xl:grid-cols-(--editor-columns)">
        <Panel>
          <p className="mb-4 text-sm text-ink-3">
            From <span className="text-ink">{message.name}</span> &lt;
            <a href={`mailto:${message.email}`} className="text-primary hover:underline">
              {message.email}
            </a>
            &gt;
          </p>
          <div className="max-w-measure text-base leading-relaxed whitespace-pre-wrap text-ink">
            {message.message}
          </div>
        </Panel>
        <Panel title="Status">
          <div className="flex flex-col items-start gap-2">
            {message.status !== "replied" ? (
              <Button variant="ghost" size="sm" onClick={() => void setStatus("replied")}>
                <Icon icon={Reply} size={14} /> Mark as replied
              </Button>
            ) : null}
            {message.status !== "new" ? (
              <Button variant="ghost" size="sm" onClick={() => void setStatus("new")}>
                <Icon icon={Mail} size={14} /> Mark as unread
              </Button>
            ) : null}
            {message.status !== "archived" ? (
              <Button variant="ghost" size="sm" onClick={() => void setStatus("archived")}>
                <Icon icon={Archive} size={14} /> Archive
              </Button>
            ) : null}
            {message.status !== "spam" ? (
              <Button variant="ghost" size="sm" onClick={() => void setStatus("spam")}>
                <Icon icon={Ban} size={14} /> Mark as spam
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => void setStatus("read")}>
                Not spam
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => void remove()}>
              <Icon icon={Trash2} size={14} /> Delete
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
