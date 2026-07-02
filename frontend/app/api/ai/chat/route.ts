import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1",
});

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

  const { messages, conversationId } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages are required" }, { status: 400 });
  }

  const completion = await openai.chat.completions.create({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages,
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    stream: true,
  } as OpenAI.ChatCompletionCreateParamsStreaming);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullContent = "";

        for await (const chunk of completion) {
          const content = chunk.choices?.[0]?.delta?.content || "";
          fullContent += content;
          const data = JSON.stringify({
            content,
            finishReason: chunk.choices?.[0]?.finish_reason,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // Save messages to DB
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
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`)
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
