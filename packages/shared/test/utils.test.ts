import { describe, expect, it } from "vitest";
import {
  apaAuthorName,
  apaAuthorList,
  chartDataToCsv,
  formatApaCitation,
  formatBibtex,
  formatDuration,
  formatMonth,
  formatPeriod,
  formatResearchCitation,
  joinList,
  markdownToPlainText,
  monthsBetween,
  niceTicks,
  parseChartCsv,
  parseCsvLine,
  readingTimeMinutes,
  slugify,
  truncate,
} from "../src";

describe("slugify", () => {
  it("creates URL-safe slugs", () => {
    expect(slugify("Flood Event Prediction in Bangladesh: LSTM & GRU")).toBe(
      "flood-event-prediction-in-bangladesh-lstm-and-gru",
    );
    expect(slugify("  Café Résumé  ")).toBe("cafe-resume");
    expect(slugify("!!!")).toBe("untitled");
  });

  it("cuts long slugs at a word boundary", () => {
    const slug = slugify("a".repeat(10) + " " + "b".repeat(200), 40);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("text helpers", () => {
  it("strips markdown syntax", () => {
    expect(markdownToPlainText("## Title\n\nSome **bold** and [a link](https://x.y).\n\n- item")).toBe(
      "Title Some bold and a link. item",
    );
  });

  it("estimates reading time with a one-minute floor", () => {
    expect(readingTimeMinutes("")).toBe(1);
    expect(readingTimeMinutes("word ".repeat(660))).toBe(3);
  });

  it("truncates on word boundaries", () => {
    expect(truncate("The quick brown fox jumps", 15)).toBe("The quick…");
    expect(truncate("short", 15)).toBe("short");
  });

  it("joins lists as prose", () => {
    expect(joinList(["R", "Python", "SQL"])).toBe("R, Python and SQL");
    expect(joinList(["R"])).toBe("R");
  });
});

describe("dates", () => {
  it("formats month precision dates in UTC", () => {
    expect(formatMonth("2026-08-01")).toBe("Aug 2026");
  });

  it("formats periods including unknown starts and current roles", () => {
    expect(formatPeriod("2026-08-01", null, true)).toBe("Aug 2026 – Present");
    expect(formatPeriod("2020-01-01", "2024-09-01")).toBe("Jan 2020 – Sep 2024");
    expect(formatPeriod(null, "2026-08-01")).toBe("Until Aug 2026");
    expect(formatPeriod(null, null)).toBe("");
  });

  it("counts months and formats durations", () => {
    expect(monthsBetween("2024-09-01", "2025-12-01")).toBe(16);
    expect(formatDuration(16)).toBe("1 yr 4 mos");
    expect(formatDuration(12)).toBe("1 yr");
  });
});

describe("chart math", () => {
  it("produces nice ticks covering the data", () => {
    const ticks = niceTicks(0.12, 0.93, 5);
    expect(ticks.min).toBeLessThanOrEqual(0.12);
    expect(ticks.max).toBeGreaterThanOrEqual(0.93);
    expect(ticks.values[0]).toBe(ticks.min);
    expect(ticks.values.at(-1)).toBe(ticks.max);
  });

  it("handles flat data", () => {
    const ticks = niceTicks(5, 5);
    expect(ticks.min).toBeLessThan(5);
    expect(ticks.max).toBeGreaterThan(5);
  });

  it("parses quoted CSV cells", () => {
    expect(parseCsvLine('a,"b, c","d ""e"""')).toEqual(["a", "b, c", 'd "e"']);
  });

  it("parses wide chart CSV and round-trips it", () => {
    const parsed = parseChartCsv("epoch,LSTM,GRU\n1,0.8,0.7\n2,0.6,\n3,0.5,0.45");
    expect("data" in parsed).toBe(true);
    if (!("data" in parsed)) return;
    expect(parsed.data.x).toEqual([1, 2, 3]);
    expect(parsed.data.series[1]?.values).toEqual([0.7, null, 0.45]);
    expect(chartDataToCsv(parsed.data, "epoch")).toBe("epoch,LSTM,GRU\n1,0.8,0.7\n2,0.6,\n3,0.5,0.45");
  });

  it("reports malformed CSV instead of throwing", () => {
    expect(parseChartCsv("x")).toHaveProperty("error");
    expect(parseChartCsv("x,y\n1,2,3")).toHaveProperty("error");
  });
});

describe("citations", () => {
  it("formats APA author names", () => {
    expect(apaAuthorName("Ibrahim All-Mamun")).toBe("All-Mamun, I.");
    expect(apaAuthorName("All-Mamun, Ibrahim")).toBe("All-Mamun, I.");
    expect(apaAuthorList(["A B", "C D", "E F"])).toBe("B, A., D, C., & F, E.");
  });

  it("only uses provided fields", () => {
    const citation = formatApaCitation({ title: "A study", authors: ["Ibrahim All-Mamun"] });
    expect(citation).toBe("All-Mamun, I. (n.d.). A study.");
  });

  it("builds BibTeX with escaped values", () => {
    const bib = formatBibtex({
      title: "Risk & return",
      authors: ["Ibrahim All-Mamun"],
      venue: "Journal",
      publishedOn: "2025-01-01",
      publicationType: "journal_article",
    });
    expect(bib).toContain("@article{allmamun2025risk");
    expect(bib).toContain("title = {Risk \\& return}");
    expect(bib).toContain("journal = {Journal}");
  });

  it("formats academic project citations", () => {
    expect(
      formatResearchCitation({
        title: "Flood event prediction",
        author: "Ibrahim All-Mamun",
        kindNoun: "project",
        degree: "M.S. in Applied Statistics and Data Science",
        institution: "University of Dhaka",
        completedOn: "2025-12-01",
      }),
    ).toBe("All-Mamun, I. (2025). Flood event prediction [M.S. project, University of Dhaka].");
  });
});
