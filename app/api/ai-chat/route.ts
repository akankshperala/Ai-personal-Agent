
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { GoogleGenAI } from "@google/genai";

async function getInsforgeServerClient() {
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    cookies: await cookies(),
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Read request
    const { userId, prompt, history = [] } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 2. Authenticate the user through InsForge
    const insforge = await getInsforgeServerClient();

    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const authenticatedUserId = authData.user.id;

    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json(
        { error: "Unauthorized user" },
        { status: 403 }
      );
    }

    // 3. Fetch the authenticated user's profile
    const { data: dbUser, error: dbError } =
      await insforge.database
        .from("users")
        .select("integrations, dashboard_brief")
        .eq("id", authenticatedUserId)
        .maybeSingle();

    if (dbError) {
      console.error("AI Chat user lookup failed:", dbError);

      return NextResponse.json(
        { error: dbError.message },
        { status: 500 }
      );
    }

    if (!dbUser) {
      return NextResponse.json(
        { error: "User profile not found in public.users" },
        { status: 404 }
      );
    }

    const integrations = dbUser.integrations || {};

    const isGmailConnected =
      !!integrations.gmail?.connected;

    const isWhatsAppConnected =
      !!integrations.whatsapp?.connected;

    const origin = req.nextUrl.origin;
    const cookieHeader = req.headers.get("cookie") || "";

    // 4. Initialize context
    let gmailSummary = "No Gmail messages synced.";
    let whatsappSummary = "No WhatsApp messages synced.";

    // 5. Fetch Gmail context
    if (isGmailConnected) {
      try {
        const gmailRes = await fetch(
          `${origin}/api/gmail-mcp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(cookieHeader
                ? { Cookie: cookieHeader }
                : {}),
            },
            body: JSON.stringify({
              method: "gmail_list_messages",
              params: {
                q: "label:inbox",
                maxResults: 5,
              },
              userId: authenticatedUserId,
            }),
          }
        );

        if (gmailRes.ok) {
          const data = await gmailRes.json();
          const text = data.result?.content?.[0]?.text;

          if (text) {
            const parsed = JSON.parse(text);

            gmailSummary =
              parsed.messages
                ?.map(
                  (m: any) =>
                    `From: ${m.from}
Subject: ${m.subject}
Snippet: ${m.snippet}
Date: ${m.date}
ID: ${m.id}`
                )
                .join("\n---\n") ||
              "No recent Gmail messages found.";
          }
        } else {
          console.error(
            "Gmail MCP error:",
            await gmailRes.text()
          );
        }
      } catch (error) {
        console.error(
          "Error fetching Gmail context:",
          error
        );
      }
    }

    // 6. Fetch WhatsApp context
    if (isWhatsAppConnected) {
      try {
        const waRes = await fetch(
          `${origin}/api/whatsapp-mcp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(cookieHeader
                ? { Cookie: cookieHeader }
                : {}),
            },
            body: JSON.stringify({
              method: "whatsapp_get_recent_messages",
              userId: authenticatedUserId,
            }),
          }
        );

        if (waRes.ok) {
          const data = await waRes.json();
          const text = data.result?.content?.[0]?.text;

          if (text) {
            const parsed = JSON.parse(text);

            whatsappSummary =
              parsed.messages
                ?.map(
                  (m: any) =>
                    `Chat: ${m.chatName}
Sender: ${m.from}
Message: ${m.body}
Timestamp: ${m.timestamp}`
                )
                .join("\n---\n") ||
              "No recent WhatsApp messages found.";
          }
        } else {
          console.error(
            "WhatsApp MCP error:",
            await waRes.text()
          );
        }
      } catch (error) {
        console.error(
          "Error fetching WhatsApp context:",
          error
        );
      }
    }

    // 7. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 8. Prepare conversation history
    const formattedHistory: Array<{
      role: "user" | "model";
      parts: Array<{ text: string }>;
    }> = Array.isArray(history)
      ? history
          .filter(
            (h: any) =>
              h &&
              typeof h.text === "string" &&
              h.text.trim()
          )
          .map((h: any) => ({
            role:
              h.sender === "user" ? "user" : "model",
            parts: [{ text: h.text }],
          }))
      : [];

    formattedHistory.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    // 9. Build system instructions
    const systemPrompt = `
You are OmniSync, an advanced AI Personal Assistant.

You help users stay productive by tracking communications
across their connected applications.

LATEST GMAIL DATA:
${gmailSummary}

LATEST WHATSAPP DATA:
${whatsappSummary}

DASHBOARD BRIEF:
${JSON.stringify(dbUser.dashboard_brief || {})}

INSTRUCTIONS:

1. Give helpful, accurate and direct responses.
2. When asked about emails or messages, use the actual
   connected application data provided above.
3. Never invent emails, messages, people, dates or events.
4. If the required information is unavailable, clearly
   tell the user.
5. Respect the user's privacy.
6. Format responses using Markdown where useful.
7. Mention application names clearly, such as Gmail
   and WhatsApp.
8. Generate 2-3 useful follow-up suggestions.

Return ONLY valid JSON using this structure:

{
  "response": "Your detailed Markdown response",
  "suggestions": [
    "First follow-up question?",
    "Second follow-up question?",
    "Third follow-up question?"
  ]
}
`;

    // 10. Generate AI response
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        ...formattedHistory,
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    // 11. Parse Gemini response
    const textResponse = response.text;

    if (!textResponse) {
      return NextResponse.json(
        { error: "Gemini returned an empty response." },
        { status: 500 }
      );
    }

    try {
      const parsed = JSON.parse(textResponse);

      return NextResponse.json({
        response:
          typeof parsed.response === "string"
            ? parsed.response
            : textResponse,
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions
          : [],
      });
    } catch (error) {
      console.error(
        "Gemini JSON parsing failed:",
        error
      );

      return NextResponse.json({
        response: textResponse,
        suggestions: [
          "Can you summarize that?",
          "What should I do next?",
          "Draft an email reply",
        ],
      });
    }
  } catch (error) {
    console.error("AI Chat API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
