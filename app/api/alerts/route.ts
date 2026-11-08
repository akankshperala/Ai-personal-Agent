
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

async function getInsforgeServerClient() {
  return createServerClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    cookies: await cookies(),
  });
}

export async function GET(req: NextRequest) {
  try {
    const insforge = await getInsforgeServerClient();

    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = authData.user.id;
    const requestedUserId = req.nextUrl.searchParams.get("userId");

    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized user" },
        { status: 403 }
      );
    }

    const { data, error } = await insforge.database
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching alerts:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/alerts:", error);

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
