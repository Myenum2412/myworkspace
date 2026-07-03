import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import OpenAI from "openai";
import { createOpenAIClient, createAnthropicClient, createGeminiClient } from "@/lib/ai/client";
import { AIProvider, AI_PROVIDERS, isOpenAICompatible } from "@/lib/ai/providers";

async function streamOpenAI(provider: AIProvider, messages: { role: string; content: string }[], controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  const config = AI_PROVIDERS[provider];
  const openai = createOpenAIClient(provider);
  const completion = await openai.chat.completions.create({
    model: config.defaultModel,
    messages,
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    stream: true,
  } as OpenAI.ChatCompletionCreateParamsStreaming);

  let fullContent = "";
  for await (const chunk of completion) {
    const content = chunk.choices?.[0]?.delta?.content || "";
    fullContent += content;
    const data = JSON.stringify({ content, finishReason: chunk.choices?.[0]?.finish_reason });
    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
  }
  return fullContent;
}

async function streamAnthropic(messages: { role: string; content: string }[], controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  const anthropic = await createAnthropicClient();
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const stream = await anthropic.messages.create({
    model: AI_PROVIDERS.anthropic.defaultModel,
    max_tokens: 16384,
    system: systemMsg?.content,
    messages: chatMessages,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
      const content = chunk.delta.text || "";
      fullContent += content;
      const data = JSON.stringify({ content, finishReason: null });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    }
  }
  return fullContent;
}

async function streamGemini(messages: { role: string; content: string }[], controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  const genAI = await createGeminiClient();
  const model = genAI.getGenerativeModel({ model: AI_PROVIDERS.gemini.defaultModel });

  const chatMessages = messages.filter((m) => m.role !== "system");
  const history = chatMessages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));
  const lastMessage = chatMessages[chatMessages.length - 1];

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(lastMessage.content);

  let fullContent = "";
  for await (const chunk of result.stream) {
    const content = chunk.text() || "";
    const delta = content.slice(fullContent.length);
    fullContent = content;
    const data = JSON.stringify({ content: delta, finishReason: null });
    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
  }
  return fullContent;
}

export async function POST(req: NextRequest) {
  let session;
  try { session = await auth(); } catch { /* ignore */ }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role || "";
  if (role === "member" || role === "workspace" || role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { messages, conversationId, provider: rawProvider } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages are required" }, { status: 400 });
  }

  const provider: AIProvider = rawProvider || "nvidia";
  if (!AI_PROVIDERS[provider]) {
    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullContent = "";

        if (isOpenAICompatible(provider)) {
          fullContent = await streamOpenAI(provider, messages, controller, encoder);
        } else if (provider === "anthropic") {
          fullContent = await streamAnthropic(messages, controller, encoder);
        } else if (provider === "gemini") {
          fullContent = await streamGemini(messages, controller, encoder);
        }

        const { db } = await import("@/lib/db");
        const { v4: uuid } = await import("uuid");
        const now = new Date();

        const userMsg = messages[messages.length - 1];
        if (conversationId) {
          await db.collection("ai_messages").insertOne({
            id: uuid(),
            conversationId,
            role: "user",
            content: userMsg.content,
            createdAt: now,
          });
          await db.collection("ai_messages").insertOne({
            id: uuid(),
            conversationId,
            role: "assistant",
            content: fullContent,
            createdAt: now,
          });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
