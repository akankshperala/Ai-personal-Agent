
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { GoogleGenAI } from "@google/genai";

async function getInsforgeServerClient() {
  return createServerClient({
    cookies: await cookies(),
  });
}

const EMPTY_BRIEF_DATA = {
  stats: {
    importantCount: 0,
    priorityCount: 0,
    followUpCount: 0,
  },
  brief: [],
  priorityItems: [],
};

export async function POST(req: NextRequest) {
  try {
    // 1. Create an authenticated InsForge server client
    const insforge = await getInsforgeServerClient();

    // 2. Verify the currently authenticated user
    const {
      data: authData,
      error: authError,
    } = await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const authenticatedUserId = authData.user.id;

    // 3. Read request options
    const { forceRegenerate = false } = await req.json();

    // 4. Fetch this authenticated user's integrations and cached brief
    const { data: dbUser, error: dbError } = await insforge.database
      .from("users")
      .select("integrations, dashboard_brief")
      .eq("id", authenticatedUserId)
      .maybeSingle();

    if (dbError) {
      console.error("Dashboard brief database lookup failed:", {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
      });

      return NextResponse.json(
        { error: "Database lookup failed." },
        { status: 500 }
      );
    }

    if (!dbUser) {
      console.error(
        "Dashboard brief: No user record found:",
        authenticatedUserId
      );

      return NextResponse.json(
        { error: "User record not found." },
        { status: 404 }
      );
    }

    // 5. Return cached brief if it is less than two hours old
    const cachedBrief = dbUser.dashboard_brief as any;

    if (!forceRegenerate && cachedBrief?.generatedAt) {
      const ageMs =
        Date.now() - new Date(cachedBrief.generatedAt).getTime();

      const twoHoursMs = 2 * 60 * 60 * 1000;

      if (
        Number.isFinite(ageMs) &&
        ageMs >= 0 &&
        ageMs < twoHoursMs
      ) {
        return NextResponse.json({
          ...cachedBrief,
          isFromCache: true,
        });
      }
    }

    // 6. Check connected integrations
    const integrations = dbUser.integrations || {};

    const isGmailConnected = !!integrations.gmail?.connected;
    const isWhatsAppConnected = !!integrations.whatsapp?.connected;

    const origin = req.nextUrl.origin;

    // Forward the current browser session to internal API routes
    const cookieHeader = req.headers.get("cookie") || "";

    const internalHeaders = {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    };

    let gmailMessages: any[] = [];
    let whatsappMessages: any[] = [];

    // 7. Fetch Gmail messages if connected
    if (isGmailConnected) {
      try {
        const gmailRes = await fetch(`${origin}/api/gmail-mcp`, {
          method: "POST",
          headers: internalHeaders,
          body: JSON.stringify({
            method: "gmail_list_messages",
            params: {
              q: "label:inbox",
              maxResults: 5,
            },
          }),
          cache: "no-store",
        });

        if (gmailRes.ok) {
          const data = await gmailRes.json();
          const text = data.result?.content?.[0]?.text;

          if (text) {
            const parsed = JSON.parse(text);
            gmailMessages = parsed.messages || [];
          }
        } else {
          console.error(
            "Gmail messages request failed:",
            gmailRes.status
          );
        }
      } catch (error) {
        console.error("Error fetching Gmail messages:", error);
      }
    }

    // 8. Fetch WhatsApp messages if connected
    if (isWhatsAppConnected) {
      try {
        const waRes = await fetch(`${origin}/api/whatsapp-mcp`, {
          method: "POST",
          headers: internalHeaders,
          body: JSON.stringify({
            method: "whatsapp_get_recent_messages",
          }),
          cache: "no-store",
        });

        if (waRes.ok) {
          const data = await waRes.json();
          const text = data.result?.content?.[0]?.text;

          if (text) {
            const parsed = JSON.parse(text);
            whatsappMessages = parsed.messages || [];
          }
        } else {
          console.error(
            "WhatsApp messages request failed:",
            waRes.status
          );
        }
      } catch (error) {
        console.error("Error fetching WhatsApp messages:", error);
      }
    }

    // 9. Check whether real communication data is available
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    const hasData =
      gmailMessages.length > 0 ||
      whatsappMessages.length > 0;

    // No fabricated data: return an empty briefing if nothing is available
    if (!hasData) {
      const emptyBriefData = {
        ...EMPTY_BRIEF_DATA,
        generatedAt: new Date().toISOString(),
        isSimulated: false,
        message:
          "No recent messages are available from your connected integrations.",
      };

      const { error: saveError } = await insforge.database
        .from("users")
        .update({ dashboard_brief: emptyBriefData })
        .eq("id", authenticatedUserId);

      if (saveError) {
        console.error("Failed to save empty dashboard brief:", saveError);
      }

      return NextResponse.json(emptyBriefData);
    }

    // 10. Generate the briefing using Gemini
    if (!hasApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const systemPrompt = `You are an advanced AI personal assistant named OmniSync.

Analyze the following recent email and chat communications.
Generate a structured intelligence briefing for the user's dashboard.

Current date and time: ${new Date().toISOString()}
Day: ${format(new Date(), "EEEE")}

Connected communications data:

Gmail messages:
${JSON.stringify(gmailMessages.slice(0, 5), null, 2)}

WhatsApp messages:
${JSON.stringify(whatsappMessages.slice(0, 5), null, 2)}

Generate a valid JSON object matching this schema:

{
  "stats": {
    "importantCount": number,
    "priorityCount": number,
    "followUpCount": number
  },
  "brief": [
    {
      "id": string,
      "app": "gmail" | "whatsapp",
      "type": "Gmail Digest" | "WhatsApp Digest",
      "title": string,
      "summary": string,
      "time": string,
      "action": string
    }
  ],
  "priorityItems": [
    {
      "id": string,
      "app": "gmail" | "whatsapp",
      "title": string,
      "time": string,
      "description": string,
      "priority": "High" | "Medium" | "Low"
    }
  ]
}

Rules:
1. Only include information supported by the provided messages.
2. Never invent tasks, meetings, people, or deadlines.
3. Keep summaries and descriptions concise, preferably under 12 words.
4. Counts must match the actual items generated.
5. Return JSON only, without Markdown code fences.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const textResponse = response.text;

    if (!textResponse) {
      throw new Error("Gemini returned an empty response.");
    }

    const parsed = JSON.parse(textResponse);

    // 11. Save the generated briefing
    const newBriefData = {
      ...parsed,
      generatedAt: new Date().toISOString(),
      isSimulated: false,
    };

    const { error: saveError } = await insforge.database
      .from("users")
      .update({
        dashboard_brief: newBriefData,
      })
      .eq("id", authenticatedUserId);

    if (saveError) {
      console.error("Failed to save generated dashboard brief:", saveError);

      return NextResponse.json(
        { error: "Brief generated but could not be saved." },
        { status: 500 }
      );
    }

    return NextResponse.json(newBriefData);

  } catch (err: unknown) {
    console.error("Error in dashboard-brief API:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
