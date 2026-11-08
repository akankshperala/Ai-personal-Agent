import { NextRequest, NextResponse } from "next/server";
import { hasInsforgeAdminKey, insforgeAdmin } from "@/lib/insforge-admin";
import { publishAlertRealtimeEvent } from "@/lib/alerts-realtime";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Internal Server Error";
}

const statusByAction: Record<string, string> = {
  resolved: "resolved",
  snoozed: "snoozed",
  task: "active",
  follow_up: "active",
  send_reply: "resolved",
};

export async function POST(req: NextRequest) {
  try {
    if (!hasInsforgeAdminKey) {
      return NextResponse.json(
        { error: "INSFORGE_API_KEY is required to update alerts with RLS enabled." },
        { status: 503 }
      );
    }

    const { userId, alertId, action } = await req.json();

    if (!userId || !alertId || !action) {
      return NextResponse.json(
        { error: "Required fields: userId, alertId, action" },
        { status: 400 }
      );
    }

    const status = statusByAction[action] || "active";
    const updates: Record<string, string> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (action === "snoozed") {
      const snoozedUntil = new Date();
      snoozedUntil.setHours(snoozedUntil.getHours() + 2);
      updates.snoozed_until = snoozedUntil.toISOString();
    }

    if (action === "task" || action === "follow_up" || action === "send_reply") {
      updates.last_action = action;
    }

    const { data, error } = await insforgeAdmin.database
      .from("alerts")
      .update(updates)
      .eq("id", alertId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await publishAlertRealtimeEvent(userId, "alert_updated", {
      alertId,
      status,
      action
    });

    return NextResponse.json(data || { id: alertId, status });
  } catch (err: unknown) {
    console.error("Error in POST /api/alerts/actions:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
