import { describe, expect, it } from "vitest";

import { parseReviewMarkdown } from "@/lib/services/reviewParser";

describe("parseReviewMarkdown", () => {
  it("extracts open questions from a filled-in review", () => {
    const markdown = `
## Open Questions
- Should we use Zod or Yup?
- What Node version?
`;

    const result = parseReviewMarkdown(markdown);

    expect(result.openQuestions).toHaveLength(2);
    expect(result.openQuestions[0]).toContain("Zod or Yup");
    expect(result.rawContent).toBe(markdown);
  });

  it("extracts manual steps from a filled-in review", () => {
    const markdown = `
## Manual Steps Required
1. Run npx supabase db push
`;

    const result = parseReviewMarkdown(markdown);

    expect(result.manualSteps).toHaveLength(1);
    expect(result.manualSteps[0]).toContain("supabase db push");
  });

  it("returns empty arrays for a blank template", () => {
    const markdown = `
## Open Questions
| # | Question | Impact if Not Resolved |
|---|----------|------------------------|
|   |          |                        |
`;

    const result = parseReviewMarkdown(markdown);

    expect(result.openQuestions).toHaveLength(0);
  });

  it("returns empty arrays when Open Questions section is missing", () => {
    const markdown = `# REVIEW_01\n\nNo questions section here.`;

    const result = parseReviewMarkdown(markdown);

    expect(result.openQuestions).toHaveLength(0);
    expect(result.manualSteps).toHaveLength(0);
  });
});
