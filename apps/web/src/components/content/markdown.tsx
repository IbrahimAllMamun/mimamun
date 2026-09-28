import Link from "next/link";
import type { ComponentProps } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { Element, Root, RootContent } from "hast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import { unified } from "unified";
import { cn } from "@/lib/cn";

/**
 * Markdown from the CMS is parsed to an AST, raw HTML is dropped, the result
 * is sanitised against an allow-list and rendered as React elements — no
 * dangerouslySetInnerHTML. Only http(s) and mailto links survive.
 */
const schema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    "p", "a", "strong", "em", "del", "code", "pre", "blockquote", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6", "hr", "br", "table", "thead", "tbody", "tr", "th", "td", "sup", "sub",
  ],
  attributes: {
    a: ["href", "title"],
    code: [["className", /^language-[a-z0-9-]+$/]],
    th: ["align"],
    td: ["align"],
    ol: ["start"],
  },
  protocols: { href: ["http", "https", "mailto"] },
  clobberPrefix: "md-",
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize, schema);

/** Keeps the page outline valid: markdown headings start below the surrounding heading. */
function shiftHeadings(node: Root | RootContent, base: number) {
  if (node.type === "element") {
    const match = /^h([1-6])$/.exec(node.tagName);
    if (match) (node as Element).tagName = `h${Math.min(6, Number(match[1]) + base - 1)}`;
  }
  if ("children" in node) for (const child of node.children) shiftHeadings(child as RootContent, base);
}

function MarkdownLink({ href = "", children, ...props }: ComponentProps<"a">) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  const external = /^https?:/.test(href);
  return (
    <a href={href} {...props} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

export function Markdown({
  source,
  className,
  headingBase = 3,
  as: Wrapper = "div",
}: {
  source: string | null | undefined;
  className?: string;
  /** Level that a markdown "# Heading" maps to. */
  headingBase?: number;
  as?: "div" | "section";
}) {
  if (!source?.trim()) return null;
  const tree = processor.runSync(processor.parse(source)) as Root;
  shiftHeadings(tree, headingBase);
  const content = toJsxRuntime(tree, { Fragment, jsx, jsxs, components: { a: MarkdownLink } });
  return <Wrapper className={cn("prose", className)}>{content}</Wrapper>;
}
