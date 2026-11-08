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
// Fallback high-fidelity mock database for simulator
const MOCK_EMAILS = [
  {
    id: "msg_12345",
    threadId: "thread_12345",
    from: "John Doe <john.doe@acme.com>",
    to: "Rahul <rahul@omnisync.ai>",
    subject: "Q2 Slides & Marketing Budget Proposal",
    date: new Date().toISOString(),
    snippet: "Hey, could you send me the final Q2 presentation slides by 4:45 PM today? Also, I need your input...",
    body: "Hey Rahul,\n\nCould you send me the final Q2 presentation slides by 4:45 PM today? Also, I need your input on whether we should increase the marketing budget by 10% next quarter to accommodate the new product roadmap timeline.\n\nThanks,\nJohn",
    labels: ["INBOX", "UNREAD", "URGENT"]
  },
  {
    id: "msg_67890",
    threadId: "thread_67890",
    from: "Sarah Jenkins <sarah.j@finance.corp>",
    to: "Rahul <rahul@omnisync.ai>",
    subject: "NDA for Client Review",
    date: new Date(Date.now() - 3600000).toISOString(),
    snippet: "Hi Rahul, please review the final NDA terms from the client. Let me know if everything is good to go...",
    body: "Hi Rahul,\n\nPlease review the final NDA terms from the client. Let me know if everything is good to go so we can sign off and finalize the partnership in 2 days.\n\nBest regards,\nSarah Jenkins\nDirector of Finance",
    labels: ["INBOX", "UNREAD"]
  },
  {
    id: "msg_11223",
    threadId: "thread_11223",
    from: "Alex Rivera <alex@startup.co>",
    to: "Rahul <rahul@omnisync.ai>",
    subject: "Coffee tomorrow at 4:30 PM?",
    date: new Date(Date.now() - 7200000).toISOString(),
    snippet: "Hey! Are you free tomorrow at 4:30 PM for coffee near the downtown office? I'd love to sync...",
    body: "Hey Rahul,\n\nAre you free tomorrow at 4:30 PM for coffee near the downtown office? I'd love to sync on the technical roadmap and next deployment milestones.\n\nLet me know if that works for you!\n\nCheers,\nAlex",
    labels: ["INBOX"]
  },
  {
    id: "msg_44556",
    threadId: "thread_44556",
    from: "OpenAI Billing <billing@openai.com>",
    to: "Rahul <rahul@omnisync.ai>",
    subject: "Your monthly invoice is ready",
    date: new Date(Date.now() - 86400000).toISOString(),
    snippet: "Your OpenAI API usage invoice for May is ready. The amount of $14.20 has been charged...",
    body: "Dear Customer,\n\nYour OpenAI API usage invoice for May is ready. The amount of $14.20 has been charged to your card ending in 4242.\n\nYou can access your billing dashboard to download the PDF receipt.\n\nThank you for using OpenAI services,\nThe OpenAI Team",
    labels: ["INBOX"]
  }
];

let simulatedSent: any[] = [];
let simulatedDrafts: any[] = [];

// Helper to base64url-decode email body parts
function base64UrlDecode(str: string): string {
  // Replace base64url characters to standard base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if missing
  while (base64.length % 4) {
    base64 += "=";
  }
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch (e) {
    return "";
  }
}

// Recursively extract email body text
function extractBody(payload: any): string {
  if (payload.body?.data) {
    return base64UrlDecode(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return base64UrlDecode(part.body.data);
      }
      if (part.mimeType === "text/html" && part.body?.data) {
        // Fallback to HTML if plain text isn't directly available in standard part
        return base64UrlDecode(part.body.data).replace(/<[^>]*>/g, ""); // simple tag strip
      }
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }
  return "";
}

// Authenticated fetch wrapper for Google API
async function fetchGoogleAPI(endpoint: string, token: string, method = "GET", body?: any) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Gmail API Error (${res.status}): ${errText}`);
  }

  return res.json();
}

// Refresh Google OAuth token helper
async function getActiveAccessToken(userId: string) {
  const insforge = await getInsforgeServerClient();

  // Verify the current session
  const { data: authData, error: authError } =
    await insforge.auth.getCurrentUser();

  if (authError || !authData?.user) {
    throw new Error("Your InsForge session is not authenticated.");
  }

  // Do not allow a request to access another user's Gmail
  if (authData.user.id !== userId) {
    throw new Error("Authenticated user does not match requested user.");
  }

  const { data: dbUser, error: dbError } =
    await insforge.database
      .from("users")
      .select("integrations")
      .eq("id", authData.user.id)
      .maybeSingle();

  if (dbError) {
    console.error("InsForge integrations query failed:", dbError);
    throw new Error("Could not retrieve user integrations from database.");
  }

  if (!dbUser) {
    throw new Error("User profile not found.");
  }

  const gmail = dbUser.integrations?.gmail;

  if (!gmail?.connected || gmail.isSimulated || !gmail.refreshToken) {
    throw new Error("No valid real Gmail connection found. Please reconnect Gmail.");
  }

  // Return the existing access token if it has not expired
  if (gmail.accessToken && gmail.expiresAt > Date.now() + 60000) {
    return gmail.accessToken;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not configured.");
  }

  // Refresh the Google access token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: gmail.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google token refresh failed:", errorText);
    throw new Error("Google could not refresh your Gmail authorization. Please reconnect Gmail.");
  }

  const tokenData = await response.json();
  const newAccessToken = tokenData.access_token;

  if (!newAccessToken) {
    throw new Error("Google did not return a refreshed access token.");
  }

  const updatedIntegrations = {
    ...dbUser.integrations,
    gmail: {
      ...gmail,
      accessToken: newAccessToken,
      expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
    },
  };

  const { error: updateError } = await insforge.database
    .from("users")
    .update({ integrations: updatedIntegrations })
    .eq("id", authData.user.id);

  if (updateError) {
    console.error("Failed to save refreshed Gmail token:", updateError);
    throw new Error("Could not save refreshed Gmail authorization.");
  }

  return newAccessToken;
}

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();
    const { method, params, userId, id = 1 } = requestBody;

    if (!method || !userId) {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request: method and userId are required" },
        id
      }, { status: 400 });
    }

    const requestFrame = {
      jsonrpc: "2.0",
      method,
      params,
      id
    };

    let result: any = null;
    let error: any = null;

    // Retrieve active access token (will return null if simulated/mock connection is active)
    let token: string;

try {
  token = await getActiveAccessToken(userId);
} catch (err) {
  console.error("Token fetch/refresh exception:", err);

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: err instanceof Error ? err.message : "Gmail authentication failed.",
      },
      id,
    },
    { status: 401 }
  );
}

    if (token) {
      // -------------------------------------------------------------
      // REAL GMAIL CONNECTION PATH (Google API Calls)
      // -------------------------------------------------------------
      try {
        switch (method) {
          case "gmail_list_messages": {
            const q = params?.q || "label:inbox";
            const maxResults = params?.maxResults || 10;

            const listData = await fetchGoogleAPI(
              `messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`,
              token
            );
            const messages = listData.messages || [];

            // Fetch headers for each message in parallel
            const detailedMessages = await Promise.all(
              messages.map(async (msg: any) => {
                try {
                  const detail = await fetchGoogleAPI(
                    `messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
                    token
                  );
                  const headers = detail.payload?.headers || [];
                  const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
                  const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
                  const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || detail.internalDate;

                  return {
                    id: detail.id,
                    threadId: detail.threadId,
                    from,
                    subject,
                    date: new Date(isNaN(Number(date)) ? date : Number(date)).toISOString(),
                    snippet: detail.snippet,
                    labels: detail.labelIds || []
                  };
                } catch (e) {
                  return null;
                }
              })
            );

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    messages: detailedMessages.filter(Boolean)
                  }, null, 2)
                }
              ]
            };
            break;
          }

          case "gmail_get_message": {
            const messageId = params?.id;
            const detail = await fetchGoogleAPI(`messages/${messageId}?format=full`, token);
            
            const headers = detail.payload?.headers || [];
            const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
            const toHeader = headers.find((h: any) => h.name.toLowerCase() === "to")?.value || "";
            const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
            const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || detail.internalDate;

            const parsedEmail = {
              id: detail.id,
              threadId: detail.threadId,
              from,
              to: toHeader,
              subject,
              date: new Date(isNaN(Number(date)) ? date : Number(date)).toISOString(),
              snippet: detail.snippet,
              body: extractBody(detail.payload) || detail.snippet,
              labels: detail.labelIds || []
            };

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(parsedEmail, null, 2)
                }
              ]
            };
            break;
          }

          case "gmail_search_messages": {
            const q = params?.q || "";
            const maxResults = params?.maxResults || 10;

            const listData = await fetchGoogleAPI(
              `messages?q=${encodeURIComponent(q)}&maxResults=${maxResults}`,
              token
            );
            const messages = listData.messages || [];

            const detailedMessages = await Promise.all(
              messages.map(async (msg: any) => {
                try {
                  const detail = await fetchGoogleAPI(
                    `messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
                    token
                  );
                  const headers = detail.payload?.headers || [];
                  const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
                  const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
                  const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || detail.internalDate;

                  return {
                    id: detail.id,
                    threadId: detail.threadId,
                    from,
                    subject,
                    date: new Date(isNaN(Number(date)) ? date : Number(date)).toISOString(),
                    snippet: detail.snippet,
                    labels: detail.labelIds || []
                  };
                } catch (e) {
                  return null;
                }
              })
            );

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    messages: detailedMessages.filter(Boolean)
                  }, null, 2)
                }
              ]
            };
            break;
          }

          case "gmail_send_message": {
            const { to, subject, body } = params || {};
            
            // Construct standard RFC 2822 email payload
            const rawMessage = [
              `To: ${to}`,
              `Subject: ${subject}`,
              `Content-Type: text/plain; charset=utf-8`,
              `MIME-Version: 1.0`,
              ``,
              body
            ].join("\r\n");

            // Base64url encode raw email message
            const encoded = Buffer.from(rawMessage).toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");

            const sendData = await fetchGoogleAPI("messages/send", token, "POST", {
              raw: encoded
            });

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    message: "Email sent successfully via Gmail API",
                    messageId: sendData.id,
                    threadId: sendData.threadId
                  }, null, 2)
                }
              ]
            };
            break;
          }

          case "gmail_create_draft": {
            const { to, subject, body } = params || {};
            const rawMessage = [
              `To: ${to}`,
              `Subject: ${subject}`,
              `Content-Type: text/plain; charset=utf-8`,
              `MIME-Version: 1.0`,
              ``,
              body
            ].join("\r\n");

            const encoded = Buffer.from(rawMessage).toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");

            const draftData = await fetchGoogleAPI("drafts", token, "POST", {
              message: { raw: encoded }
            });

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    message: "Draft created successfully via Gmail API",
                    draft: draftData
                  }, null, 2)
                }
              ]
            };
            break;
          }

          case "gmail_get_thread": {
            const threadId = params?.id;
            const threadData = await fetchGoogleAPI(`threads/${threadId}`, token);
            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(threadData, null, 2)
                }
              ]
            };
            break;
          }

          default:
            error = { code: -32601, message: `Method not found: ${method}` };
        }
      } catch (apiErr: any) {
        console.error("Live Gmail API call failed:", apiErr);
        error = { code: -32603, message: apiErr.message || "Google API request failed." };
      }

    } else {
      // -------------------------------------------------------------
      // SIMULATED MOCK CONNECTION PATH
      // -------------------------------------------------------------
      switch (method) {
        case "gmail_list_messages": {
          const query = params?.q || "label:inbox";
          const maxResults = params?.maxResults || 10;
          
          let filtered = [...MOCK_EMAILS, ...simulatedSent];
          if (query.includes("label:inbox")) {
            filtered = filtered.filter(e => e.labels.includes("INBOX"));
          }

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  messages: filtered.slice(0, maxResults).map(e => ({
                    id: e.id,
                    threadId: e.threadId,
                    from: e.from,
                    subject: e.subject,
                    date: e.date,
                    snippet: e.snippet,
                    labels: e.labels
                  }))
                }, null, 2)
              }
            ]
          };
          break;
        }

        case "gmail_get_message": {
          const messageId = params?.id;
          const email = [...MOCK_EMAILS, ...simulatedDrafts, ...simulatedSent].find(e => e.id === messageId);

          if (!email) {
            error = { code: -32602, message: `Message with ID ${messageId} not found` };
          } else {
            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(email, null, 2)
                }
              ]
            };
          }
          break;
        }

        case "gmail_search_messages": {
          const query = params?.q || "";
          const lowerQuery = query.toLowerCase();

          const filtered = [...MOCK_EMAILS, ...simulatedSent].filter(e => 
            e.subject.toLowerCase().includes(lowerQuery) || 
            e.from.toLowerCase().includes(lowerQuery) || 
            e.body.toLowerCase().includes(lowerQuery)
          );

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  messages: filtered.map(e => ({
                    id: e.id,
                    threadId: e.threadId,
                    from: e.from,
                    subject: e.subject,
                    date: e.date,
                    snippet: e.snippet,
                    labels: e.labels
                  }))
                }, null, 2)
              }
            ]
          };
          break;
        }

        case "gmail_send_message": {
          const { to, subject, body } = params || {};
          const sentId = `msg_${Math.random().toString(36).substring(2, 9)}`;
          const newSent = {
            id: sentId,
            threadId: `thread_${Math.random().toString(36).substring(2, 9)}`,
            from: "Rahul <rahul@omnisync.ai>",
            to,
            subject,
            date: new Date().toISOString(),
            snippet: body.substring(0, 100) + "...",
            body: body,
            labels: ["SENT", "INBOX"]
          };

          simulatedSent.push(newSent);

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: "Email sent successfully (Simulated)",
                  messageId: sentId,
                  threadId: newSent.threadId
                }, null, 2)
              }
            ]
          };
          break;
        }

        case "gmail_create_draft": {
          const { to, subject, body, threadId } = params || {};
          const draftId = `draft_${Math.random().toString(36).substring(2, 9)}`;
          const newDraft = {
            id: draftId,
            threadId: threadId || `thread_${Math.random().toString(36).substring(2, 9)}`,
            from: "Rahul <rahul@omnisync.ai>",
            to,
            subject,
            date: new Date().toISOString(),
            snippet: body.substring(0, 100) + "...",
            body: body,
            labels: ["DRAFT"]
          };

          simulatedDrafts.push(newDraft);

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: "Draft created successfully (Simulated)",
                  draft: {
                    id: draftId,
                    message: {
                      id: draftId,
                      threadId: newDraft.threadId
                    }
                  }
                }, null, 2)
              }
            ]
          };
          break;
        }

        case "gmail_get_thread": {
          const threadId = params?.id;
          const threadEmails = [...MOCK_EMAILS, ...simulatedSent, ...simulatedDrafts].filter(e => e.threadId === threadId);

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  id: threadId,
                  messages: threadEmails
                }, null, 2)
              }
            ]
          };
          break;
        }

        default:
          error = { code: -32601, message: `Method not found: ${method}` };
      }
    }

    const responseFrame = error 
      ? { jsonrpc: "2.0", error, id } 
      : { jsonrpc: "2.0", result, id };

    return NextResponse.json({
      requestFrame,
      responseFrame,
      result,
      error
    });

  } catch (err: any) {
    console.error("Error in gmail-mcp API route:", err);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32603, message: err.message || "Internal Server Error" },
      id: 1
    }, { status: 500 });
  }
}
