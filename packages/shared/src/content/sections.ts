import { z } from "zod";
import { blocksSchema, type Block } from "./blocks";

/**
 * Case-study and research sections. Each section holds a list of content
 * blocks; the order below is the narrative order used on the public site
 * (Problem → Data → Method → Model → Evaluation → Result → Impact).
 */
export interface SectionDefinition {
  key: string;
  label: string;
  help: string;
}

export const PROJECT_SECTIONS = [
  { key: "overview", label: "Overview", help: "The full description: what the project is and why it exists." },
  { key: "problem", label: "Problem", help: "The question or business problem being solved." },
  { key: "objective", label: "Objective", help: "What a successful outcome looks like." },
  { key: "data", label: "Data", help: "Sources, size, time span, quality issues, access constraints." },
  { key: "methodology", label: "Methodology", help: "The analytical approach and why it was chosen." },
  { key: "feature_engineering", label: "Feature engineering", help: "Transformations and derived variables." },
  { key: "modeling", label: "Modeling", help: "Models considered and the final specification." },
  { key: "evaluation", label: "Evaluation", help: "Validation design, metrics and baselines." },
  { key: "results", label: "Results", help: "What the evaluation showed. Use real figures only." },
  { key: "impact", label: "Impact", help: "Business or research impact of the work." },
  { key: "challenges", label: "Challenges", help: "What was difficult and how it was handled." },
  { key: "lessons_learned", label: "Lessons learned", help: "What you would repeat or change." },
] as const satisfies readonly SectionDefinition[];

export type ProjectSectionKey = (typeof PROJECT_SECTIONS)[number]["key"];

export const RESEARCH_SECTIONS = [
  { key: "data", label: "Data", help: "Data sources, sampling and preparation." },
  { key: "methodology", label: "Methodology", help: "Study design and analytical approach." },
  { key: "statistical_methods", label: "Statistical methods", help: "Tests, estimators and diagnostics." },
  { key: "models", label: "Models", help: "Model specifications and comparisons." },
  { key: "findings", label: "Findings", help: "Results as reported in the work. Do not overstate." },
  { key: "limitations", label: "Limitations", help: "Threats to validity and open questions." },
] as const satisfies readonly SectionDefinition[];

export type ResearchSectionKey = (typeof RESEARCH_SECTIONS)[number]["key"];

function sectionsSchemaFor<const K extends string>(keys: readonly K[]) {
  const shape = Object.fromEntries(keys.map((key) => [key, blocksSchema.default([])])) as Record<
    K,
    z.ZodDefault<typeof blocksSchema>
  >;
  return z.preprocess(
    (value) => (value === undefined || value === null ? {} : value),
    z.object(shape),
  );
}

export const projectSectionsSchema = sectionsSchemaFor(PROJECT_SECTIONS.map((s) => s.key));
export const researchSectionsSchema = sectionsSchemaFor(RESEARCH_SECTIONS.map((s) => s.key));

export type ProjectSections = Record<ProjectSectionKey, Block[]>;
export type ResearchSections = Record<ResearchSectionKey, Block[]>;

export interface RenderedSection {
  key: string;
  label: string;
  blocks: Block[];
}

/** Returns non-empty sections in narrative order. */
export function orderedSections(
  definitions: readonly SectionDefinition[],
  sections: Partial<Record<string, Block[]>> | null | undefined,
): RenderedSection[] {
  if (!sections) return [];
  return definitions
    .map((definition) => ({
      key: definition.key,
      label: definition.label,
      blocks: sections[definition.key] ?? [],
    }))
    .filter((section) => section.blocks.length > 0);
}

export function emptySections<K extends string>(
  definitions: readonly { key: K }[],
): Record<K, Block[]> {
  return Object.fromEntries(definitions.map((definition) => [definition.key, []])) as unknown as Record<
    K,
    Block[]
  >;
}
