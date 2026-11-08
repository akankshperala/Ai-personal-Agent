
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { GoogleGenAI } from "@google/genai";
import { format } from "date-fns";

async function getServerClient() {
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    cookies: await cookies(),
  });
}

async function getAuthenticatedUser() {
  const client = await getServerClient();
  const { data, error } = await client.auth.getCurrentUser();

  if (error || !data?.user) {
    return { client, user: null };
  }

  return { client, user: data.user };
}

export async function GET(req: NextRequest) {
  try {
    const { client, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");

    let query = client.database
      .from("generated_briefings")
      .select("*")
      .eq("user_id", user.id);

    if (id) {
      const { data, error } = await query.eq("id", id).maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data) return NextResponse.json({ error: "Briefing not found" }, { status: 404 });

      return NextResponse.json(data);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Error in GET /api/briefings:", err);
    return NextResponse.json({ error: "Failed to retrieve briefings." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { client, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    }

    const { scheduleId } = await req.json();
    const origin = req.nextUrl.origin;

    let scheduleName = `Daily Briefing — ${format(new Date(), "MMM d, yyyy")}`;
    let scheduleDesc = "Your daily communication digest and action items summary.";
    let categories = ["email", "messages", "mentions", "tasks", "follow_ups"];
    let apps = ["gmail", "whatsapp"];

    if (scheduleId) {
      const { data: schedule, error } = await client.database
        .from("briefing_schedules")
        .select("*")
        .eq("id", scheduleId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!schedule) {
        return NextResponse.json({ error: "Briefing schedule not found." }, { status: 404 });
      }

      scheduleName = schedule.name;
      scheduleDesc = schedule.description || scheduleDesc;
      categories = schedule.categories?.length ? schedule.categories : categories;
      apps = schedule.apps?.length ? schedule.apps : apps;
    }

    const { data: userRow, error: userError } = await client.database
      .from("users")
      .select("integrations")
      .eq("id", user.id)
      .maybeSingle();

    if (userError) {
      console.error("Failed to read integrations:", userError);
      return NextResponse.json({ error: "Could not read your connected apps." }, { status: 500 });
    }

    if (!userRow) {
      return NextResponse.json({ error: "Your user profile was not found." }, { status: 404 });
    }

    const integrations = userRow.integrations || {};
    const hasGmail = !!integrations.gmail?.connected;
    const hasWhatsApp = !!integrations.whatsapp?.connected;

    if ((!apps.includes("gmail") || !hasGmail) && (!apps.includes("whatsapp") || !hasWhatsApp)) {
      return NextResponse.json(
        { error: "No connected apps found for this briefing. Check your Integrations page and schedule settings." },
        { status: 400 }
      );
    }

    const cookieHeader = (await cookies()).toString();
    const headers = {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    };

    let gmailMessages: any[] = [];
    let whatsappMessages: any[] = [];
    const connectedAppsUsed: string[] = [];

    if (apps.includes("gmail") && hasGmail) {
      try {
        const response = await fetch(`${origin}/api/gmail-mcp`, {
          method: "POST",
          headers,
          body: JSON.stringify({
  method: "gmail_list_messages",
  params: { q: "label:inbox is:unread", maxResults: 15 },
  userId: user.id,
}),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("Gmail MCP error:", result);
        } else {
          const text = result.result?.content?.[0]?.text;
          if (text) {
            gmailMessages = JSON.parse(text).messages || [];
          }

          if (gmailMessages.length > 0) connectedAppsUsed.push("Gmail");
        }
      } catch (error) {
        console.error("Gmail fetch failed:", error);
      }
    }

    if (apps.includes("whatsapp") && hasWhatsApp) {
      try {
        const response = await fetch(`${origin}/api/whatsapp-mcp`, {
          method: "POST",
          headers,
          body: JSON.stringify({
  method: "whatsapp_get_recent_messages",
  userId: user.id,
}),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("WhatsApp MCP error:", result);
        } else {
          const text = result.result?.content?.[0]?.text;
          if (text) {
            whatsappMessages = JSON.parse(text).messages || [];
          }

          if (whatsappMessages.length > 0) connectedAppsUsed.push("WhatsApp");
        }
      } catch (error) {
        console.error("WhatsApp fetch failed:", error);
      }
    }

    const hasAnyData = gmailMessages.length > 0 || whatsappMessages.length > 0;

    if (!hasAnyData) {
      return NextResponse.json(
        { error: "Your app is connected, but no messages were retrieved. Check the Gmail/WhatsApp API logs." },
        { status: 502 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    let parsed: any = null;

    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const prompt = `You are OmniSync, an AI personal assistant. Create a briefing using ONLY this real communication data.

Briefing: ${scheduleName}
Goal: ${scheduleDesc}
Date: ${format(new Date(), "EEEE, MMMM d, yyyy")}
Categories: ${categories.join(", ")}

GMAIL:
${JSON.stringify(gmailMessages)}

WHATSAPP:
${JSON.stringify(whatsappMessages)}

Return valid JSON with this structure:
{
  "title": "Briefing title",
  "summary": "Short summary based only on the supplied messages",
  "stats": {
    "email": 0,
    "messages": 0,
    "mentions": 0,
    "tasks": 0,
    "follow_ups": 0
  },
  "data": {
    "email": [],
    "messages": [],
    "mentions": [],
    "tasks": [],
    "follow_ups": []
  }
}

Never invent messages, people, tasks, or events.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (response.text) parsed = JSON.parse(response.text);
      } catch (error) {
        console.error("Gemini briefing generation failed:", error);
      }
    }

    const emailItems = gmailMessages.map((msg: any, i: number) => ({
      id: msg.id || `email_${i}`,
      app: "gmail",
      from: msg.from || "Unknown",
      subject: msg.subject || "No Subject",
      snippet: msg.snippet || "",
      time: msg.date ? format(new Date(msg.date), "h:mm a") : "",
      body: msg.body || msg.snippet || "",
    }));

    const messageItems = whatsappMessages.map((msg: any, i: number) => ({
      id: msg.id || `wa_${i}`,
      app: "whatsapp",
      from: msg.from || msg.chatName || "Unknown",
      snippet: msg.body || "",
      time: msg.timestamp ? format(new Date(msg.timestamp), "h:mm a") : "",
      body: msg.body || "",
    }));

    const title = parsed?.title || scheduleName;
    const summary = parsed?.summary ||
      `${emailItems.length} emails and ${messageItems.length} messages retrieved from connected apps.`;

    const { data, error } = await client.database
      .from("generated_briefings")
      .insert({
        user_id: user.id,
        schedule_id: scheduleId || null,
        title,
        summary,
        stats: parsed?.stats || {
          email: emailItems.length,
          messages: messageItems.length,
          mentions: 0,
          tasks: 0,
          follow_ups: 0,
        },
        data: parsed?.data || {
          email: emailItems,
          messages: messageItems,
          mentions: [],
          tasks: [],
          follow_ups: [],
        },
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to save briefing:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/briefings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
