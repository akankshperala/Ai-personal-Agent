import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { context, type, from, subject, body, replyType } = await req.json();

    if (!context && !body) {
      return NextResponse.json({ error: "Context or body is required" }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const isEmail = type === "email" || replyType === "email";

    const prompt = isEmail
      ? `You are OmniSync, an AI personal assistant. Draft a professional, concise email reply.

Original Email:
From: ${from || "Unknown"}
Subject: ${subject || "No Subject"}
Body: ${body || context}

Instructions:
- Write a professional, friendly email reply
- Keep it concise (2-4 short paragraphs)
- Address the key points from the original email
- Use a professional closing
- Do NOT include subject line or email headers, just the body text
- Output only the email body text, no markdown formatting`
      : `You are OmniSync, an AI personal assistant. Draft a concise, natural message reply.

Original Message:
From: ${from || "Unknown"}
Message: ${body || context}

Instructions:
- Write a natural, friendly message reply
- Keep it brief and conversational (1-3 sentences max)
- Address the key point of the message
- Output only the message text, no formatting`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });

    const draft = response.text || "";

    return NextResponse.json({ draft: draft.trim() });
  } catch (err: any) {
    console.error("Error in POST /api/briefings/ai-draft:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
