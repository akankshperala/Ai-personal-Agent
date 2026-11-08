import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { hasInsforgeAdminKey, insforgeAdmin } from "@/lib/insforge-admin";
import { publishAlertRealtimeEvent } from "@/lib/alerts-realtime";

const monitorableApps = new Set(["gmail", "whatsapp"]);

type Suggestion = {
  title: string;
  description: string;
  apps: string[];
  priority: "high" | "medium" | "low";
  condition: string;
  action: "notify" | "draft_reply" | "create_task" | "mark_follow_up";
};

type MessageLike = {
  subject?: string;
  snippet?: string;
  body?: string;
};

type IntegrationValue = {
  connected?: boolean;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Internal Server Error";
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function fetchActivitySummary(
  origin: string,
  userId: string,
  apps: string[],
  cookieHeader?: string
) {
  const summary = {
    gmailUnread: 0,
    whatsappMessages: 0,
    terms: [] as string[]
  };

  if (apps.includes("gmail")) {
    try {
      const res = await fetch(`${origin}/api/gmail-mcp`, {
        method: "POST",
        headers: {
  "Content-Type": "application/json",
  ...(cookieHeader ? { Cookie: cookieHeader } : {}),
},
        body: JSON.stringify({
          method: "gmail_list_messages",
          params: { q: "label:inbox is:unread newer_than:7d", maxResults: 10 },
          userId
        })
      });
      const json = await res.json();
      const text = json.result?.content?.[0]?.text;
      const messages = text ? JSON.parse(text).messages || [] : [];
      summary.gmailUnread = messages.length;
      summary.terms.push(...(messages as MessageLike[]).flatMap((message) => [
        message.subject,
        message.snippet,
        message.body
      ]).filter(isString).slice(0, 10));
    } catch (error) {
      console.error("[alerts-suggestions] Gmail summary failed:", error);
    }
  }

  if (apps.includes("whatsapp")) {
    try {
      const res = await fetch(`${origin}/api/whatsapp-mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "whatsapp_get_recent_messages", userId })
      });
      const json = await res.json();
      const text = json.result?.content?.[0]?.text;
      const messages = text ? JSON.parse(text).messages || [] : [];
      summary.whatsappMessages = messages.length;
      summary.terms.push(...(messages as MessageLike[]).map((message) => message.body).filter(isString).slice(0, 10));
    } catch (error) {
      console.error("[alerts-suggestions] WhatsApp summary failed:", error);
    }
  }

  return summary;
}

function buildDeterministicSuggestions(apps: string[], summary: Awaited<ReturnType<typeof fetchActivitySummary>>): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (apps.includes("gmail") && summary.gmailUnread > 0) {
    suggestions.push({
      title: "Unread email needing response",
      description: `Monitor ${summary.gmailUnread} unread Gmail message${summary.gmailUnread === 1 ? "" : "s"} for reply requests, approvals, deadlines, and client follow-ups.`,
      apps: ["gmail"],
      priority: "high",
      condition: "Unread Gmail contains reply, approve, urgent, deadline, invoice, review, or follow up",
      action: "draft_reply"
    });
  }

  if (apps.includes("whatsapp") && summary.whatsappMessages > 0) {
    suggestions.push({
      title: "Message follow-up detector",
      description: `Watch recent WhatsApp activity across ${summary.whatsappMessages} message${summary.whatsappMessages === 1 ? "" : "s"} for commitments and unanswered requests.`,
      apps: ["whatsapp"],
      priority: "medium",
      condition: "Recent WhatsApp message contains tomorrow, remind, send, confirm, review, or follow up",
      action: "mark_follow_up"
    });
  }

  if (apps.length > 1 && (summary.gmailUnread > 0 || summary.whatsappMessages > 0)) {
    suggestions.push({
      title: "Cross-app urgent mention",
      description: "Alert when any connected monitored app contains urgent language or a direct mention that requires action.",
      apps,
      priority: "high",
      condition: "Connected app activity contains urgent, blocked, asap, deadline, or direct action request",
      action: "notify"
    });
  }

  return suggestions.slice(0, 3);
}

export async function GET(req: NextRequest) {
  try {
    if (!hasInsforgeAdminKey) {
      return NextResponse.json(
        { error: "INSFORGE_API_KEY is required to generate alert suggestions with RLS enabled." },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { data: userRow, error } = await insforgeAdmin.database
      .from("users")
      .select("integrations")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const integrations = userRow?.integrations || {};
    const connectedApps = Object.entries(integrations as Record<string, IntegrationValue | null>)
      .filter(([, value]) => !!value?.connected)
      .map(([key]) => key)
      .filter(app => monitorableApps.has(app));

    if (connectedApps.length === 0) {
      return NextResponse.json([]);
    }

    const cookieHeader = req.headers.get("cookie") || "";

const activitySummary = await fetchActivitySummary(
  req.nextUrl.origin,
  userId,
  connectedApps,
  cookieHeader
);
    let suggestions = buildDeterministicSuggestions(connectedApps, activitySummary);

    if (process.env.GEMINI_API_KEY && activitySummary.terms.length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Create up to 3 useful alert recommendations from the user's real connected app activity.

Connected monitored apps: ${connectedApps.join(", ")}
Activity counts: ${JSON.stringify(activitySummary)}
Recent activity excerpts:
${activitySummary.terms.join("\n---\n")}

Return valid JSON only:
[
  {
    "title": "short alert name",
    "description": "why this alert is useful based on the real activity",
    "apps": ["gmail" | "whatsapp"],
    "priority": "high" | "medium" | "low",
    "condition": "specific trigger rule",
    "action": "notify" | "draft_reply" | "create_task" | "mark_follow_up"
  }
]

Only use connected monitored apps. Do not invent activity.`,
          config: { responseMimeType: "application/json" }
        });
        const parsed = JSON.parse(response.text || "[]");
        if (Array.isArray(parsed)) {
          suggestions = parsed
            .filter((item: Partial<Suggestion>) => Array.isArray(item.apps) && item.apps.every((app: string) => connectedApps.includes(app)))
            .slice(0, 3);
        }
      } catch (error) {
        console.error("[alerts-suggestions] Gemini suggestions failed:", error);
      }
    }

    await publishAlertRealtimeEvent(userId, "alert_suggestions_updated", { count: suggestions.length });

    return NextResponse.json(suggestions);
  } catch (err: unknown) {
    console.error("Error in GET /api/alerts/suggestions:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
