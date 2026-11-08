import { GoogleGenAI } from "@google/genai";
import { hasInsforgeAdminKey, insforgeAdmin } from "./insforge-admin";
import { publishAlertRealtimeEvent } from "./alerts-realtime";

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const monitorableApps = new Set(["gmail", "whatsapp"]);

type IntegrationValue = {
  connected?: boolean;
};

type UserIntegrationRow = {
  integrations?: Record<string, IntegrationValue | null>;
};

export type AppActivity = {
  id: string;
  app: string;
  title: string;
  description: string;
  body: string;
  time?: string;
};

type AlertCandidate = {
  activityId: string;
  sourceApp: string;
  title: string;
  description: string;
  fullDetails: string;
  priority: "high" | "medium" | "low";
  requiresResponse: boolean;
  condition: string;
  suggestedAction: string;
};

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function appLogo(app: string) {
  if (app === "gmail") return "/001-gmail.png";
  if (app === "whatsapp") return "/002-whatsapp.png";
  return "/003-email.png";
}

function normalizePriority(value: unknown): "high" | "medium" | "low" {
  return value === "high" || value === "low" ? value : "medium";
}

export async function getConnectedMonitorableApps(userId: string): Promise<string[]> {
  // Read the user's integration map and keep only apps supported by the alert
  // monitor. This prevents the generator from trying to scan unsupported tools.
  const { data: userRow, error } = await insforgeAdmin.database
    .from("users")
    .select("integrations")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[alert-auto-generation] User integrations fetch failed:", error);
    return [];
  }

  const integrations = ((userRow as UserIntegrationRow | null)?.integrations || {}) as Record<string, IntegrationValue | null>;
  return Object.entries(integrations)
    .filter(([, value]) => !!value?.connected)
    .map(([key]) => key)
    .filter(app => monitorableApps.has(app));
}

export async function fetchConnectedActivity(
  userId: string,
  apps: string[] = [],
  cookieHeader?: string
): Promise<AppActivity[]> {
  const activity: AppActivity[] = [];

  if (apps.includes("gmail")) {
    try {
      // Reuse the existing Gmail proxy route so OAuth/token-refresh behavior
      // stays centralized in one API surface.
      const res = await fetch(`${APP_URL}/api/gmail-mcp`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
  },
  body: JSON.stringify({
    method: "gmail_list_messages",
    params: {
      q: "label:inbox is:unread newer_than:7d",
      maxResults: 20,
    },
    userId,
  }),
});
      const json = await res.json();
      const text = json.result?.content?.[0]?.text;
      const messages = text ? JSON.parse(text).messages || [] : [];

      for (const message of messages) {
        activity.push({
          id: message.id,
          app: "gmail",
          title: message.subject || "Unread Gmail message",
          description: message.snippet || "",
          body: message.body || message.snippet || "",
          time: message.date
        });
      }
    } catch (error) {
      console.error("[alert-auto-generation] Gmail MCP fetch failed:", error);
    }
  }

  if (apps.includes("whatsapp")) {
    try {
      // WhatsApp activity is fetched through the app route for the same reason:
      // session management remains owned by the WhatsApp integration layer.
      const res = await fetch(`${APP_URL}/api/whatsapp-mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "whatsapp_get_recent_messages", userId })
      });
      const json = await res.json();
      const text = json.result?.content?.[0]?.text;
      const messages = text ? JSON.parse(text).messages || [] : [];

      for (const message of messages) {
        activity.push({
          id: message.id || `${message.chatName}-${message.timestamp}`,
          app: "whatsapp",
          title: message.chatName || message.from || "WhatsApp message",
          description: message.body || "",
          body: message.body || "",
          time: message.timestamp
        });
      }
    } catch (error) {
      console.error("[alert-auto-generation] WhatsApp MCP fetch failed:", error);
    }
  }

  return activity.filter(item => isString(item.id) && isString(item.app));
}

function buildHeuristicCandidates(activity: AppActivity[]): AlertCandidate[] {
  const importantTerms = ["urgent", "asap", "deadline", "blocked", "approve", "review", "reply", "respond", "follow up", "follow-up", "invoice", "confirm"];

  // Heuristics are the fallback when Gemini is unavailable. They intentionally
  // favor obvious action language over broad summarization.
  return activity
    .filter(item => importantTerms.some(term => `${item.title} ${item.description} ${item.body}`.toLowerCase().includes(term)))
    .slice(0, 5)
    .map(item => ({
      activityId: item.id,
      sourceApp: item.app,
      title: item.app === "gmail" ? "Email may need attention" : "Message may need follow-up",
      description: item.description || item.title,
      fullDetails: item.body || item.description,
      priority: /urgent|asap|deadline|blocked/i.test(`${item.title} ${item.description} ${item.body}`) ? "high" : "medium",
      requiresResponse: /reply|respond|confirm|approve|review|follow/i.test(`${item.title} ${item.description} ${item.body}`),
      condition: "AI auto-monitor detected important connected app activity",
      suggestedAction: "Review this item and respond, resolve, snooze, or convert it into a task."
    }));
}

async function buildAiCandidates(activity: AppActivity[]): Promise<AlertCandidate[]> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || activity.length === 0) return buildHeuristicCandidates(activity);

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `You are OmniSync's alert monitor. Analyze only this real connected app activity and return important alerts that deserve the user's attention.

Real activity:
${JSON.stringify(activity.slice(0, 25), null, 2)}

Return valid JSON only:
[
  {
    "activityId": "must match one activity id",
    "sourceApp": "gmail or whatsapp",
    "title": "short alert title",
    "description": "one sentence summary",
    "fullDetails": "specific details from the real activity",
    "priority": "high" | "medium" | "low",
    "requiresResponse": boolean,
    "condition": "why this alert was triggered",
    "suggestedAction": "recommended next action"
  }
]

Rules:
- Only create alerts for genuinely important items: deadlines, approvals, unanswered direct asks, urgent language, follow-ups, blockers, invoices, tasks, or commitments.
- Do not invent facts.
- Return [] if nothing is important.`,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(response.text || "[]");
    if (!Array.isArray(parsed)) return [];

    const activityIds = new Set(activity.map(item => `${item.app}:${item.id}`));
    return parsed
      .filter(item => activityIds.has(`${item.sourceApp}:${item.activityId}`))
      .slice(0, 5)
      .map(item => ({
        activityId: String(item.activityId),
        sourceApp: item.sourceApp === "whatsapp" ? "whatsapp" : "gmail",
        title: String(item.title || "Important app activity"),
        description: String(item.description || ""),
        fullDetails: String(item.fullDetails || item.description || ""),
        priority: normalizePriority(item.priority),
        requiresResponse: Boolean(item.requiresResponse),
        condition: String(item.condition || "AI auto-monitor detected important connected app activity"),
        suggestedAction: String(item.suggestedAction || "Review this item and take the next action.")
      }));
  } catch (error) {
    console.error("[alert-auto-generation] Gemini alert generation failed:", error);
    return buildHeuristicCandidates(activity);
  }
}

export async function generateAutomaticAlertsForUser(
  userId: string,
  cookieHeader?: string
) {
  if (!hasInsforgeAdminKey) {
    console.error("[alert-auto-generation] INSFORGE_API_KEY is required for background alert generation because alerts uses RLS.");
    return { created: 0, scanned: 0, error: "Missing INSFORGE_API_KEY" };
  }

  const apps = await getConnectedMonitorableApps(userId);
  if (apps.length === 0) return { created: 0, scanned: 0 };

  const activity = await fetchConnectedActivity(
  userId,
  apps,
  cookieHeader
);
  if (activity.length === 0) return { created: 0, scanned: 0 };

  const candidates = await buildAiCandidates(activity);
  let created = 0;

  for (const candidate of candidates) {
    // The dedupe key ties one alert to one source item, so repeated cron runs
    // can safely rescan the same inbox/message history without duplicating rows.
    const dedupeKey = `auto-ai:${userId}:${candidate.sourceApp}:${candidate.activityId}`;
    const { data: existing } = await insforgeAdmin.database
      .from("alerts")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();

    if (existing) continue;

    const { data: alert, error } = await insforgeAdmin.database
      .from("alerts")
      .insert({
        user_id: userId,
        rule_id: null,
        dedupe_key: dedupeKey,
        title: candidate.title,
        description: candidate.description,
        full_details: candidate.fullDetails,
        source_app: candidate.sourceApp,
        app_logo: appLogo(candidate.sourceApp),
        priority: candidate.priority,
        status: "triggered",
        condition: candidate.condition,
        requires_response: candidate.requiresResponse,
        suggested_action: candidate.suggestedAction
      })
      .select()
      .single();

    if (error) {
      console.error("[alert-auto-generation] Alert insert failed:", error);
      continue;
    }

    created += 1;
    if (alert) {
      await publishAlertRealtimeEvent(userId, "alert_created", { alert });
    }
  }

  return { created, scanned: activity.length };
}
