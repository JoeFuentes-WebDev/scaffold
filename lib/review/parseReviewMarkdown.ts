export interface ParsedReview {
  rawContent: string;
  openQuestions: string[];
  manualSteps: string[];
}

function extractSectionContent(content: string, headerPattern: RegExp): string {
  const lines = content.split("\n");
  let sectionStart = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (headerPattern.test(lines[index].trim())) {
      sectionStart = index + 1;
      break;
    }
  }

  if (sectionStart === -1) {
    return "";
  }

  const sectionLines: string[] = [];

  for (let index = sectionStart; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^##\s+/.test(line.trim()) && index > sectionStart) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines.join("\n").trim();
}

function extractListItems(sectionContent: string): string[] {
  if (!sectionContent.trim()) {
    return [];
  }

  const items: string[] = [];

  for (const line of sectionContent.split("\n")) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (bulletMatch) {
      items.push(bulletMatch[1].trim());
      continue;
    }

    if (numberedMatch) {
      items.push(numberedMatch[1].trim());
    }
  }

  return items.filter((item) => item.length > 0);
}

export function parseReviewMarkdown(content: string): ParsedReview {
  const openQuestionsSection = extractSectionContent(
    content,
    /^##\s+Open Questions/i
  );
  const manualStepsSection =
    extractSectionContent(content, /^##\s+Manual Steps/i) ||
    extractSectionContent(content, /^##\s+Manual Step/i);

  return {
    rawContent: content,
    openQuestions: extractListItems(openQuestionsSection),
    manualSteps: extractListItems(manualStepsSection),
  };
}
