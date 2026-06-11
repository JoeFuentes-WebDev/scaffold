import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  return new Anthropic({ apiKey });
}

export function parseClaudeJson<T>(rawText: string): T {
  const trimmed = rawText.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    throw new Error("Claude returned malformed JSON");
  }
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const anthropic = getAnthropicClient();

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned an empty response");
  }

  return textBlock.text;
}
