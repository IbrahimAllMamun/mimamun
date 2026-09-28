import { headers } from "next/headers";
import { jsonLdString } from "@/lib/seo";

/** Structured data block. Data scripts are not executed; the nonce satisfies strict CSP reporters. */
export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}
