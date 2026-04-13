import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { settings } from "../db/schema.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";

// System prompt instructs the AI to return Mermaid diagram code
const SYSTEM_PROMPT = `You are a helpful assistant that converts natural language descriptions into Mermaid diagram definitions.
When the user describes something, respond ONLY with a valid Mermaid diagram definition. Do not include any markdown fences, explanations, or other text.
Just output the raw Mermaid syntax (e.g. starting with graph, flowchart, sequenceDiagram, classDiagram, etc).
Make sure the diagram is syntactically correct and uses appropriate Mermaid diagram types for the content described.`;

async function getOpenAIKey(): Promise<string | null> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, "openai_api_key"),
  });
  return row?.value || null;
}

export function createAIRouter() {
  const router = new Hono();

  // POST /api/ai/text-to-diagram — Proxy to OpenAI, return SSE in TTD format
  router.post("/text-to-diagram", async (c) => {
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      return c.json(
        { error: "OpenAI API key not configured. Set it in Settings." },
        503,
      );
    }

    const body = await c.req.json();
    const { messages } = body as {
      messages: Array<{ role: string; content: string }>;
    };

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: "messages array required" }, 400);
    }

    // Build OpenAI messages with system prompt
    const openaiMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: openaiMessages,
        stream: true,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return c.json(
        { error: `OpenAI error: ${errorText}` },
        openaiResponse.status as any,
      );
    }

    // Stream OpenAI's response, converting to TTD's SSE format
    return streamSSE(c, async (stream) => {
      const reader = openaiResponse.body?.getReader();
      if (!reader) {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "error",
            error: { message: "No response body" },
          }),
        });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) {
              continue;
            }
            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              await stream.writeSSE({
                data: JSON.stringify({
                  type: "done",
                  finishReason: "stop",
                }),
              });
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              const finishReason = parsed.choices?.[0]?.finish_reason;

              if (delta) {
                await stream.writeSSE({
                  data: JSON.stringify({ type: "content", delta }),
                });
              }
              if (finishReason) {
                await stream.writeSSE({
                  data: JSON.stringify({
                    type: "done",
                    finishReason,
                  }),
                });
              }
            } catch {
              // skip unparseable lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    });
  });

  return router;
}
