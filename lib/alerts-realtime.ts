import { insforge } from "./insforge";

export async function publishAlertRealtimeEvent(
  userId: string,
  event: "alert_created" | "alert_updated" | "alert_rule_created" | "alert_suggestions_updated",
  payload: Record<string, unknown>
) {
  try {
    // Each user gets a private logical channel so dashboard clients only need
    // to subscribe to their own alert stream.
    const channel = `alerts:${userId}`;
    await insforge.realtime.connect();
    await insforge.realtime.publish(channel, event, payload);
  } catch (error) {
    console.error("[alerts-realtime] Publish failed:", error);
  }
}
