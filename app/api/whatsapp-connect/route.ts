import { NextRequest, NextResponse } from "next/server";
import { initWhatsAppConnection, getWhatsAppSession, disconnectWhatsApp } from "@/lib/whatsapp";
import { insforge } from "@/lib/insforge";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Internal Server Error";
}

export async function POST(req: NextRequest) {
  try {
    const { action, userId, phoneNumber } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (action === "connect") {
      if (!phoneNumber) {
        return NextResponse.json({ error: "Phone number is required for connection." }, { status: 400 });
      }

      await disconnectWhatsApp(userId);

      let session = await initWhatsAppConnection(userId, phoneNumber, { forceNew: true });

      // Wait briefly for pairing code generation or immediate connection state changes.
      if (session.status === "connecting" && !session.pairingCode) {
        for (let attempt = 0; attempt < 16; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          session = getWhatsAppSession(userId) ?? session;

          if (session.status === "connected" || session.pairingCode) {
            break;
          }
        }
      }

      return NextResponse.json({
        success: true,
        status: session.status,
        pairingCode: session.pairingCode,
      });
    }

    if (action === "status") {
      const session = getWhatsAppSession(userId);

      if (!session) {
        const { data: dbUser } = await insforge.database
          .from("users")
          .select("integrations")
          .eq("id", userId)
          .maybeSingle();

        const integrations = dbUser?.integrations || {};
        if (integrations.whatsapp?.connected) {
          if (integrations.whatsapp.isSimulated) {
            return NextResponse.json({
              success: true,
              status: "connected",
              isSimulated: true
            });
          } else {
            // Auto-reconnect background process
            initWhatsAppConnection(userId, integrations.whatsapp.phoneNumber).catch(console.error);
            return NextResponse.json({
              success: true,
              status: "connecting",
            });
          }
        }

        return NextResponse.json({
          success: true,
          status: "disconnected",
        });
      }

      return NextResponse.json({
        success: true,
        status: session.status,
        pairingCode: session.pairingCode,
      });
    }

    if (action === "disconnect") {
      await disconnectWhatsApp(userId);
      return NextResponse.json({ success: true, status: "disconnected" });
    }

    if (action === "connect-simulated") {
      const { data: dbUser } = await insforge.database
        .from("users")
        .select("integrations")
        .eq("id", userId)
        .maybeSingle();

      const currentIntegrations = dbUser?.integrations || {};
      const updatedIntegrations = {
        ...currentIntegrations,
        whatsapp: {
          connected: true,
          phoneNumber: phoneNumber || "+15550199",
          isSimulated: true,
          connectedAt: new Date().toISOString()
        }
      };

      await insforge.database
        .from("users")
        .update({ integrations: updatedIntegrations })
        .eq("id", userId);

      return NextResponse.json({
        success: true,
        status: "connected",
        isSimulated: true
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: unknown) {
    console.error("WhatsApp connect API exception:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
