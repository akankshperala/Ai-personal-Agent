import { NextResponse } from "next/server";
import SentDm from "@sentdm/sentdm";
import { storeOtp } from "@/lib/otp-store";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { phoneNumber, method } = await request.json() as {
      phoneNumber: string;
      method: "sms" | "whatsapp";
    };

    if (!phoneNumber || !method) {
      return NextResponse.json(
        { error: "Phone number and method are required" },
        { status: 400 }
      );
    }

    if (!["sms", "whatsapp"].includes(method)) {
      return NextResponse.json(
        { error: "Method must be 'sms' or 'whatsapp'" },
        { status: 400 }
      );
    }

    const apiKey = process.env.SENT_DM_API_KEY;
    const templateId = process.env.SENT_DM_TEMPLATE_ID || "6a729b2b-25c5-4172-8f43-1631ffbf7911";

    if (!apiKey || apiKey === "your_sent_dm_api_key_here") {
      return NextResponse.json(
        { error: "Sent.dm API key is not configured. Please add SENT_DM_API_KEY to your .env file." },
        { status: 500 }
      );
    }

    // Generate a 6-digit OTP
    const otp = generateOTP();

    // Persist OTP server-side with 10-minute TTL
    storeOtp(phoneNumber, method, otp);

    // Initialize Sent.dm client
    const client = new SentDm({ apiKey });

    // Send OTP via Sent.dm — template variable must be "var_1"
    await client.messages.send({
      to: [phoneNumber],
      template: {
        id: templateId,
        parameters: {
          var_1: otp,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `OTP sent via ${method === "whatsapp" ? "WhatsApp" : "SMS"}`,
      // Always return OTP so you can verify it matches what was sent
      otp,
    });
  } catch (error: unknown) {
    console.error("Error sending OTP:", error);
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
