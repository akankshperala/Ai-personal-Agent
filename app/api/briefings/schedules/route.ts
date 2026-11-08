import { NextRequest, NextResponse } from "next/server";
import { insforge } from "@/lib/insforge";

function getNextRunTime(scheduledTimeStr: string, frequency: string): Date {
  const now = new Date();
  const [hours, minutes] = scheduledTimeStr.split(":").map(Number);
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  
  if (date <= now) {
    if (frequency === "hourly") {
      date.setHours(date.getHours() + 1);
    } else if (frequency === "weekly") {
      date.setDate(date.getDate() + 7);
    } else {
      // daily
      date.setDate(date.getDate() + 1);
    }
  }
  return date;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { data, error } = await insforge.database
      .from("briefing_schedules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("Error in GET /api/briefings/schedules:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      name,
      description,
      apps,
      categories,
      scheduledTime,
      frequency,
      priorityLevel
    } = body;

    if (!userId || !name || !scheduledTime || !frequency || !priorityLevel) {
      return NextResponse.json(
        { error: "Required fields: userId, name, scheduledTime, frequency, priorityLevel" },
        { status: 400 }
      );
    }

    // Calculate initial next run time
    const nextRun = getNextRunTime(scheduledTime, frequency);

    const { data, error } = await insforge.database
      .from("briefing_schedules")
      .insert({
        user_id: userId,
        name,
        description: description || "",
        apps: apps || [],
        categories: categories || [],
        scheduled_time: scheduledTime,
        frequency,
        priority_level: priorityLevel,
        next_run_at: nextRun.toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error in POST /api/briefings/schedules:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const id = searchParams.get("id");

    if (!userId || !id) {
      return NextResponse.json({ error: "User ID and Schedule ID are required" }, { status: 400 });
    }

    const { error } = await insforge.database
      .from("briefing_schedules")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in DELETE /api/briefings/schedules:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
