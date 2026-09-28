import { describe, expect, it } from "vitest";
import { getIn, newId, setIn } from "@/components/admin/form/paths";

describe("form paths", () => {
  it("reads nested values", () => {
    const record = { sections: { results: [{ data: { markdown: "Hi" } }] } };
    expect(getIn(record, "sections.results.0.data.markdown")).toBe("Hi");
    expect(getIn(record, "sections.missing.0")).toBeUndefined();
  });

  it("writes immutably and creates missing containers", () => {
    const record = { title: "A", metrics: [{ label: "AUC" }] };
    const next = setIn(record, "metrics.0.value", "0.8");
    expect(next).toEqual({ title: "A", metrics: [{ label: "AUC", value: "0.8" }] });
    expect(record.metrics[0]).toEqual({ label: "AUC" });
    expect(
      Array.isArray((setIn({}, "gallery.0.caption", "x") as { gallery: unknown }).gallery),
    ).toBe(true);
  });

  it("creates version 4 UUIDs", () => {
    expect(newId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
