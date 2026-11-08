import { schedules, task } from "@trigger.dev/sdk/v3";
import { insforge } from "../lib/insforge";
import { hasInsforgeAdminKey, insforgeAdmin } from "../lib/insforge-admin";
import { publishAlertRealtimeEvent } from "../lib/alerts-realtime";
import {
  type AppActivity,
  fetchConnectedActivity,
  generateAutomaticAlertsForUser,
  getConnectedMonitorableApps
} from "../lib/alert-auto-generation";

type AlertRule = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  apps?: string[];
  condition?: string;
  priority?: string;
  frequency?: string;
  action?: string;
};

function getNextCheckAt(frequency?: string): string {
  const next = new Date();
  if (frequency === "hourly") next.setHours(next.getHours() + 1);
  else if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "15_minutes") next.setMinutes(next.getMinutes() + 15);
  else next.setMinutes(next.getMinutes() + 5);
  return next.toISOString();
}

function matchesCondition(rule: AlertRule, item: AppActivity): boolean {
  const haystack = `${item.title} ${item.description} ${item.body}`.toLowerCase();
  const terms = (rule.condition || rule.name || "")
    .toLowerCase()
    .split(/[^a-z0-9@._-]+/)
    .filter(term => term.length > 3);

  if (terms.some(term => haystack.includes(term))) return true;

  const urgentTerms = ["urgent", "deadline", "asap", "blocked", "follow up", "follow-up", "reply", "approve", "review"];
  return urgentTerms.some(term => haystack.includes(term));
}

export const alertsCron = schedules.task({
  id: "alerts-cron",
  cron: "*/5 * * * *",
  run: async () => {
    const now = new Date().toISOString();
    const db = hasInsforgeAdminKey ? insforgeAdmin.database : insforge.database;
    const { data: rules, error } = await db
      .from("alert_rules")
      .select("*")
      .eq("status", "active")
      .lte("next_check_at", now);

    if (error) {
      console.error("[alerts-cron] DB error:", error);
      return;
    }

    for (const rule of (rules || []) as AlertRule[]) {
      await monitorAlertRuleTask.trigger({ ruleId: rule.id });
      await db
        .from("alert_rules")
        .update({ next_check_at: getNextCheckAt(rule.frequency), updated_at: now })
        .eq("id", rule.id);
    }

    const { data: users, error: usersError } = await db
      .from("users")
      .select("id, integrations");

    if (usersError) {
      console.error("[alerts-cron] Users fetch error:", usersError);
      return;
    }

    for (const user of (users || []) as { id: string }[]) {
      await autoGenerateAlertsForUserTask.trigger({ userId: user.id });
    }
  }
});

export const monitorAlertRuleTask = task({
  id: "monitor-alert-rule",
  run: async (payload: { ruleId: string }) => {
    const db = hasInsforgeAdminKey ? insforgeAdmin.database : insforge.database;
    const { data: rule, error } = await db
      .from("alert_rules")
      .select("*")
      .eq("id", payload.ruleId)
      .maybeSingle();

    if (error || !rule) {
      console.error("[monitor-alert-rule] Missing rule:", error);
      return { success: false };
    }

    const typedRule = rule as AlertRule;
    const activity = await fetchConnectedActivity(typedRule.user_id, typedRule.apps || []);
    const matches = activity.filter(item => matchesCondition(typedRule, item));

    for (const match of matches.slice(0, 5)) {
      const dedupeKey = `${typedRule.id}:${match.app}:${match.id}`;
      const { data: existing } = await db
        .from("alerts")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (existing) continue;

      const { data: alert, error: insertError } = await db.from("alerts").insert({
        user_id: typedRule.user_id,
        rule_id: typedRule.id,
        dedupe_key: dedupeKey,
        title: typedRule.name,
        description: match.description || typedRule.description || "Alert condition matched in connected app activity.",
        full_details: match.body || match.description || typedRule.condition || "",
        source_app: match.app,
        app_logo: match.app === "gmail" ? "/001-gmail.png" : "/002-whatsapp.png",
        priority: typedRule.priority || "medium",
        status: "triggered",
        condition: typedRule.condition || "",
        requires_response: typedRule.action === "draft_reply" || /reply|respond|email|message/i.test(typedRule.condition || ""),
        suggested_action: typedRule.action === "create_task"
          ? "Convert this alert into a task and assign a due date."
          : typedRule.action === "mark_follow_up"
            ? "Create a follow-up so this conversation does not go stale."
            : "Review the alert and respond from the connected app if needed."
      }).select().single();

      if (insertError) {
        console.error("[monitor-alert-rule] Alert insert failed:", insertError);
        continue;
      }

      if (alert) {
        await publishAlertRealtimeEvent(typedRule.user_id, "alert_created", { alert });
      }
    }

    return { success: true, matches: matches.length };
  }
});

export const autoGenerateAlertsForUserTask = task({
  id: "auto-generate-alerts-for-user",
  run: async (payload: { userId: string }) => {
    const apps = await getConnectedMonitorableApps(payload.userId);
    if (apps.length === 0) {
      return { success: true, created: 0, scanned: 0, reason: "No connected monitored apps" };
    }

    const result = await generateAutomaticAlertsForUser(payload.userId);
    return { success: true, ...result };
  }
});
