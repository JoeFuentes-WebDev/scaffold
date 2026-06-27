import Anthropic from "@anthropic-ai/sdk";

import { DEFAULT_MODEL } from "@/lib/config/models";

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
  userPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  const anthropic = getAnthropicClient();

  const message = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned an empty response");
  }

  return textBlock.text;
}

export async function streamClaude(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => void,
  model: string = DEFAULT_MODEL
): Promise<{ text: string; completed: boolean }> {
  const anthropic = getAnthropicClient();
  let fullText = "";

  const messageStream = anthropic.messages.stream({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  try {
    for await (const event of messageStream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
        onChunk(event.delta.text);
      }
    }

    await messageStream.finalMessage();

    if (!fullText.trim()) {
      throw new Error("Claude returned an empty response");
    }

    return { text: fullText, completed: true };
  } catch (error) {
    if (fullText.trim()) {
      return { text: fullText, completed: false };
    }

    throw error;
  }
}
