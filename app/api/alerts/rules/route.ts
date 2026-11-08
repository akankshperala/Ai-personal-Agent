import { NextRequest, NextResponse } from "next/server";
import { hasInsforgeAdminKey, insforgeAdmin } from "@/lib/insforge-admin";
import { publishAlertRealtimeEvent } from "@/lib/alerts-realtime";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Internal Server Error";
}

function getNextCheckAt(frequency: string): string {
  const next = new Date();
  if (frequency === "hourly") next.setHours(next.getHours() + 1);
  else if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "15_minutes") next.setMinutes(next.getMinutes() + 15);
  else next.setMinutes(next.getMinutes() + 5);
  return next.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    if (!hasInsforgeAdminKey) {
      return NextResponse.json(
        { error: "INSFORGE_API_KEY is required to create alert rules with RLS enabled." },
        { status: 503 }
      );
    }

    const {
      userId,
      name,
      description,
      apps,
      condition,
      priority,
      notificationMethod,
      frequency,
      action
    } = await req.json();

    if (!userId || !name || !condition || !Array.isArray(apps) || apps.length === 0) {
      return NextResponse.json(
        { error: "Required fields: userId, name, apps, condition" },
        { status: 400 }
      );
    }

    const { data, error } = await insforgeAdmin.database
      .from("alert_rules")
      .insert({
        user_id: userId,
        name,
        description: description || "",
        apps,
        condition,
        priority: priority || "medium",
        notification_method: notificationMethod || "in_app",
        frequency: frequency || "real_time",
        action: action || "notify",
        status: "active",
        next_check_at: getNextCheckAt(frequency || "real_time")
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await publishAlertRealtimeEvent(userId, "alert_rule_created", { rule: data });

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("Error in POST /api/alerts/rules:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
