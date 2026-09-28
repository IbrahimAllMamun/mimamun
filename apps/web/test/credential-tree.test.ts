import { describe, expect, it } from "vitest";
import type { CredentialNodeDTO } from "@portfolio/shared";
import { filterTree, flattenTree } from "@/components/credentials/credential-tree";

const node = (
  slug: string,
  type: string,
  children: CredentialNodeDTO[] = [],
): CredentialNodeDTO => ({
  id: slug,
  slug,
  title: slug,
  type: { name: type, slug: type },
  level: null,
  issuedOn: null,
  expiresOn: null,
  featured: false,
  verifiable: false,
  image: null,
  children,
});

const tree = [
  node("track", "track", [node("course-a", "course"), node("cert", "certificate")]),
  node("workshop", "workshop"),
];

describe("credential tree", () => {
  it("keeps matching items together with the programmes they belong to", () => {
    const filtered = filterTree(tree, "certificate");
    expect(filtered.map((item) => item.slug)).toEqual(["track"]);
    expect(filtered[0]?.children.map((item) => item.slug)).toEqual(["cert"]);
  });

  it("returns everything without a filter and flattens depth-first", () => {
    expect(filterTree(tree, null)).toBe(tree);
    expect(flattenTree(tree).map((item) => item.slug)).toEqual([
      "track",
      "course-a",
      "cert",
      "workshop",
    ]);
  });
});
