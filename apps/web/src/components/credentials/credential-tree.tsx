import Link from "next/link";
import { formatMonth, pluralize, type CredentialNodeDTO } from "@portfolio/shared";
import { StatusBadge } from "@/components/ui/status";
import { cn } from "@/lib/cn";

function countDescendants(node: CredentialNodeDTO): number {
  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
}

/** Keeps nodes of the given type, plus the ancestors needed to show where they sit. */
export function filterTree(
  nodes: CredentialNodeDTO[],
  typeSlug: string | null,
): CredentialNodeDTO[] {
  if (!typeSlug) return nodes;
  return nodes.flatMap((node) => {
    const children = filterTree(node.children, typeSlug);
    if (node.type.slug === typeSlug || children.length > 0) return [{ ...node, children }];
    return [];
  });
}

export function flattenTree(nodes: CredentialNodeDTO[]): CredentialNodeDTO[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

function CredentialRow({ node }: { node: CredentialNodeDTO }) {
  const meta = [node.type.name, node.level].filter(Boolean).join(" · ");
  return (
    <div className="group relative flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
      <div className="min-w-0 space-x-2">
        <Link
          href={`/certifications/${node.slug}`}
          className="text-ink decoration-1 underline-offset-4 after:absolute after:inset-0 group-hover:underline"
        >
          {node.title}
        </Link>
        <span className="font-mono text-xs text-ink-3">{meta}</span>
      </div>
      <div className="flex items-center gap-3">
        {node.verifiable ? <StatusBadge tone="positive">Verifiable</StatusBadge> : null}
        {node.issuedOn ? (
          <span className="font-mono text-xs text-ink-3 tabular-nums">
            <span className="sr-only">Issued </span>
            {formatMonth(node.issuedOn)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Provider → programme → course → certificate, to any depth. Branches are
 * native disclosure widgets, open by default, so long programmes can be
 * folded without JavaScript.
 */
export function CredentialTree({
  nodes,
  depth = 0,
}: {
  nodes: CredentialNodeDTO[];
  depth?: number;
}) {
  if (nodes.length === 0) return null;
  return (
    <ol className={cn(depth > 0 && "ml-1.5 border-l border-rule pl-5")}>
      {nodes.map((node) => (
        <li key={node.id} className={cn(depth === 0 && "border-b border-rule last:border-b-0")}>
          <CredentialRow node={node} />
          {node.children.length ? (
            <details open className="group/branch pb-3">
              <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-mono text-xs text-primary">
                <span
                  aria-hidden
                  className="transition-transform duration-(--duration-fast) group-open/branch:rotate-90"
                >
                  ›
                </span>
                {pluralize(countDescendants(node), "item")} in this {node.type.name.toLowerCase()}
              </summary>
              <CredentialTree nodes={node.children} depth={depth + 1} />
            </details>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
