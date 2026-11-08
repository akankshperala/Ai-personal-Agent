import { task, schedules } from "@trigger.dev/sdk/v3";
import { insforge } from "../lib/insforge";
import { GoogleGenAI } from "@google/genai";
import { format } from "date-fns";

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getNextRunTime(scheduledTimeStr: string, frequency: string): Date {
  const now = new Date();
  const [hours, minutes] = scheduledTimeStr.split(":").map(Number);
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  if (date <= now) {
    if (frequency === "hourly") date.setHours(date.getHours() + 1);
    else if (frequency === "weekly") date.setDate(date.getDate() + 7);
    else date.setDate(date.getDate() + 1);
  }
  return date;
}

// 1. Cron: check every 15 minutes for due schedules
export const briefingCron = schedules.task({
  id: "briefing-cron",
  cron: "*/15 * * * *",
  run: async () => {
    const now = new Date().toISOString();
    console.log(`[briefing-cron] Checking for due schedules at ${now}`);

    const { data: dueSchedules, error } = await insforge.database
      .from("briefing_schedules")
      .select("*")
      .lte("next_run_at", now);

    if (error) {
      console.error("[briefing-cron] DB error:", error);
      return;
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      console.log("[briefing-cron] No schedules due.");
      return;
    }

    console.log(`[briefing-cron] ${dueSchedules.length} schedule(s) due — dispatching jobs...`);

    for (const schedule of dueSchedules) {
      const nextRun = getNextRunTime(schedule.scheduled_time, schedule.frequency);
      await insforge.database
        .from("briefing_schedules")
        .update({ next_run_at: nextRun.toISOString(), updated_at: now })
        .eq("id", schedule.id);

      await generateBriefingTask.trigger({
        scheduleId: schedule.id,
        userId: schedule.user_id
      });

      console.log(`[briefing-cron] Triggered job for schedule "${schedule.name}" (user ${schedule.user_id})`);
    }
  }
});

// 2. Generator task: fetch real data + generate AI briefing
export const generateBriefingTask = task({
  id: "generate-briefing-task",
  run: async (payload: { scheduleId?: string; userId: string }) => {
    const { scheduleId, userId } = payload;
    console.log(`[generate-briefing-task] Starting for user=${userId} schedule=${scheduleId || "default"}`);

    let scheduleName = `Daily Briefing — ${format(new Date(), "MMM d, yyyy")}`;
    let scheduleDesc = "Your daily communication digest and action items summary.";
    let categories = ["email", "messages", "mentions", "tasks", "follow_ups"];
    let apps = ["gmail", "whatsapp"];

    if (scheduleId) {
      const { data: schedule } = await insforge.database
        .from("briefing_schedules")
        .select("*")
        .eq("id", scheduleId)
        .maybeSingle();

      if (schedule) {
        scheduleName = schedule.name;
        scheduleDesc = schedule.description || scheduleDesc;
        categories = schedule.categories?.length ? schedule.categories : categories;
        apps = schedule.apps?.length ? schedule.apps : apps;
      }
    }

    // Fetch integrations
    const { data: userRow } = await insforge.database
      .from("users")
      .select("integrations")
      .eq("id", userId)
      .maybeSingle();

    const integrations = userRow?.integrations || {};
    const hasGmail = !!integrations.gmail?.connected;
    const hasWhatsApp = !!integrations.whatsapp?.connected;

    let gmailMessages: any[] = [];
    let whatsappMessages: any[] = [];
    const connectedAppsUsed: string[] = [];

    // Fetch real Gmail
    if (apps.includes("gmail") && hasGmail) {
      try {
        const res = await fetch(`${APP_URL}/api/gmail-mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "gmail_list_messages",
            params: { q: "label:inbox is:unread", maxResults: 15 },
            userId
          })
        });
        if (res.ok) {
          const json = await res.json();
          const text = json.result?.content?.[0]?.text;
          if (text) {
            gmailMessages = JSON.parse(text).messages || [];
            if (gmailMessages.length > 0) connectedAppsUsed.push("Gmail");
          }
        }
        console.log(`[generate-briefing-task] Gmail: ${gmailMessages.length} messages`);
      } catch (e) {
        console.error("[generate-briefing-task] Gmail fetch error:", e);
      }
    }

    // Fetch real WhatsApp
    if (apps.includes("whatsapp") && hasWhatsApp) {
      try {
        const res = await fetch(`${APP_URL}/api/whatsapp-mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "whatsapp_get_recent_messages", userId })
        });
        if (res.ok) {
          const json = await res.json();
          const text = json.result?.content?.[0]?.text;
          if (text) {
            whatsappMessages = JSON.parse(text).messages || [];
            if (whatsappMessages.length > 0) connectedAppsUsed.push("WhatsApp");
          }
        }
        console.log(`[generate-briefing-task] WhatsApp: ${whatsappMessages.length} messages`);
      } catch (e) {
        console.error("[generate-briefing-task] WhatsApp fetch error:", e);
      }
    }

    const hasAnyData = gmailMessages.length > 0 || whatsappMessages.length > 0;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Generate with Gemini if data is available
    if (geminiApiKey && hasAnyData) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const prompt = `You are OmniSync, an AI personal assistant. Analyze the following real communications fetched from the user's connected apps and produce a structured intelligence briefing.

Briefing: "${scheduleName}"
Goal: ${scheduleDesc}
Date: ${format(new Date(), "EEEE, MMMM d, yyyy")}
Time: ${format(new Date(), "h:mm a")}
Connected apps with data: ${connectedAppsUsed.join(", ")}
Categories to include: ${categories.join(", ")}

--- REAL GMAIL INBOX (${gmailMessages.length} messages) ---
${JSON.stringify(gmailMessages, null, 2)}

--- REAL WHATSAPP MESSAGES (${whatsappMessages.length} messages) ---
${JSON.stringify(whatsappMessages, null, 2)}

Analyze the REAL data above. Produce valid JSON:
{
  "title": "Short descriptive title based on today's actual messages",
  "summary": "2-3 sentence executive summary of the most important updates",
  "stats": { "email": number, "messages": number, "mentions": number, "tasks": number, "follow_ups": number },
  "data": {
    "email": [{ "id": "string", "app": "gmail", "from": "string", "subject": "string", "snippet": "string", "time": "string", "body": "string" }],
    "messages": [{ "id": "string", "app": "whatsapp", "from": "string", "snippet": "string", "time": "string", "body": "string" }],
    "mentions": [{ "id": "string", "app": "string", "from": "string", "snippet": "string", "time": "string", "body": "string" }],
    "tasks": [{ "id": "string", "app": "string", "title": "string", "description": "string", "time": "string", "priority": "High" | "Medium" | "Low" }],
    "follow_ups": [{ "id": "string", "app": "string", "title": "string", "description": "string", "time": "string" }]
  }
}

RULES: Base ALL content ONLY on the real data provided. Do NOT invent anything. Only include categories: ${categories.join(", ")}. Return valid JSON only.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });

        const textResponse = response.text;
        if (textResponse) {
          const parsed = JSON.parse(textResponse);
          const { data, error } = await insforge.database
            .from("generated_briefings")
            .insert({
              user_id: userId,
              schedule_id: scheduleId || null,
              title: parsed.title || scheduleName,
              summary: parsed.summary || "",
              stats: parsed.stats || {},
              data: parsed.data || {}
            })
            .select();

          console.log(`[generate-briefing-task] Saved AI briefing. Error: ${error?.message || "none"}`);
          return { success: true, title: parsed.title };
        }
      } catch (aiError: any) {
        console.error("[generate-briefing-task] Gemini failed:", aiError.message);
      }
    }

    // Fallback: save raw real data without AI summarisation
    if (hasAnyData) {
      const emailItems = gmailMessages.map((msg: any, i: number) => ({
        id: msg.id || `email_${i}`,
        app: "gmail",
        from: msg.from || "Unknown",
        subject: msg.subject || "No Subject",
        snippet: msg.snippet || "",
        time: msg.date ? new Date(msg.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "",
        body: msg.body || msg.snippet || ""
      }));

      const messageItems = whatsappMessages.map((msg: any, i: number) => ({
        id: `wa_${i}`,
        app: "whatsapp",
        from: msg.from || msg.chatName || "Unknown",
        snippet: msg.body || "",
        time: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "",
        body: msg.body || ""
      }));

      await insforge.database.from("generated_briefings").insert({
        user_id: userId,
        schedule_id: scheduleId || null,
        title: scheduleName,
        summary: `${emailItems.length} email${emailItems.length !== 1 ? "s" : ""} and ${messageItems.length} message${messageItems.length !== 1 ? "s" : ""} from your connected apps.`,
        stats: { email: emailItems.length, messages: messageItems.length, mentions: 0, tasks: 0, follow_ups: 0 },
        data: { email: emailItems, messages: messageItems, mentions: [], tasks: [], follow_ups: [] }
      });

      console.log("[generate-briefing-task] Saved raw data briefing (no AI).");
      return { success: true, title: scheduleName };
    }

    console.log("[generate-briefing-task] No data from connected apps — nothing to save.");
    return { success: false, reason: "No data from connected apps" };
  }
});
