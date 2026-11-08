import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppSession, initWhatsAppConnection } from "@/lib/whatsapp";
import { insforge } from "@/lib/insforge";

const MOCK_CONTACTS: Record<string, any> = {
  "123456789@s.whatsapp.net": { id: "123456789@s.whatsapp.net", name: "Sarah Jenkins", phone: "+123456789", verifiedName: "Sarah Jenkins" },
  "987654321@s.whatsapp.net": { id: "987654321@s.whatsapp.net", name: "Alex Rivera", phone: "+987654321" },
  "111222333@s.whatsapp.net": { id: "111222333@s.whatsapp.net", name: "John Doe", phone: "+111222333" },
  "120363024555555555@g.us": { id: "120363024555555555@g.us", name: "Marketing Launch Team", isGroup: true }
};

const INITIAL_MOCK_MESSAGES: Record<string, any[]> = {
  "123456789@s.whatsapp.net": [
    { key: { id: "wmsg_1", remoteJid: "123456789@s.whatsapp.net", fromMe: false }, pushName: "Sarah Jenkins", message: { conversation: "Hi Rahul, did you check the NDA terms I sent via email?" }, messageTimestamp: Math.floor(Date.now() / 1000) - 3600 },
    { key: { id: "wmsg_2", remoteJid: "123456789@s.whatsapp.net", fromMe: true }, pushName: "Rahul", message: { conversation: "Hey Sarah! Just saw them. I will review and get back to you within 2 days." }, messageTimestamp: Math.floor(Date.now() / 1000) - 3000 },
    { key: { id: "wmsg_3", remoteJid: "123456789@s.whatsapp.net", fromMe: false }, pushName: "Sarah Jenkins", message: { conversation: "Perfect, thanks! Let's also grab lunch tomorrow to sync." }, messageTimestamp: Math.floor(Date.now() / 1000) - 1800 }
  ],
  "987654321@s.whatsapp.net": [
    { key: { id: "wmsg_4", remoteJid: "987654321@s.whatsapp.net", fromMe: false }, pushName: "Alex Rivera", message: { conversation: "Hey, are we still on for coffee tomorrow at 4:30 PM?" }, messageTimestamp: Math.floor(Date.now() / 1000) - 7200 },
    { key: { id: "wmsg_5", remoteJid: "987654321@s.whatsapp.net", fromMe: true }, pushName: "Rahul", message: { conversation: "Yes, definitely! Downtown office Starbucks works for me." }, messageTimestamp: Math.floor(Date.now() / 1000) - 7000 },
    { key: { id: "wmsg_6", remoteJid: "987654321@s.whatsapp.net", fromMe: false }, pushName: "Alex Rivera", message: { conversation: "Awesome, see you there. I want to discuss the tech roadmap." }, messageTimestamp: Math.floor(Date.now() / 1000) - 6800 }
  ],
  "111222333@s.whatsapp.net": [
    { key: { id: "wmsg_7", remoteJid: "111222333@s.whatsapp.net", fromMe: false }, pushName: "John Doe", message: { conversation: "Hey Rahul, don't forget to submit the Q2 presentation slides by 4:45 PM today." }, messageTimestamp: Math.floor(Date.now() / 1000) - 14400 },
    { key: { id: "wmsg_8", remoteJid: "111222333@s.whatsapp.net", fromMe: true }, pushName: "Rahul", message: { conversation: "Sure John, compiling the final draft now. Will send it shortly." }, messageTimestamp: Math.floor(Date.now() / 1000) - 14000 }
  ],
  "120363024555555555@g.us": [
    { key: { id: "wmsg_9", remoteJid: "120363024555555555@g.us", fromMe: false }, pushName: "Alex Rivera", message: { conversation: "Hey guys, for the marketing launch sync tomorrow, do we have the slides ready?" }, messageTimestamp: Math.floor(Date.now() / 1000) - 5400 },
    { key: { id: "wmsg_10", remoteJid: "120363024555555555@g.us", fromMe: false }, pushName: "Sarah Jenkins", message: { conversation: "I've reviewed the budget part. Just waiting on Rahul's Q2 slides." }, messageTimestamp: Math.floor(Date.now() / 1000) - 5200 },
    { key: { id: "wmsg_11", remoteJid: "120363024555555555@g.us", fromMe: false }, pushName: "John Doe", message: { conversation: "Yes, Rahul said he is sending them by 4:45 PM today." }, messageTimestamp: Math.floor(Date.now() / 1000) - 5000 }
  ]
};

const globalForSimulatedWA = global as unknown as {
  simulatedWAMessages?: Record<string, any[]>;
};

if (!globalForSimulatedWA.simulatedWAMessages) {
  globalForSimulatedWA.simulatedWAMessages = JSON.parse(JSON.stringify(INITIAL_MOCK_MESSAGES));
}

const simulatedMessages = globalForSimulatedWA.simulatedWAMessages!;

export async function POST(req: NextRequest) {
  try {
    const { method, params, userId, id = 1 } = await req.json();

    if (!method || !userId) {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request: method and userId are required" },
        id
      }, { status: 400 });
    }

    const { data: dbUser } = await insforge.database
      .from("users")
      .select("integrations")
      .eq("id", userId)
      .maybeSingle();

    const integrations = dbUser?.integrations || {};
    const whatsapp = integrations.whatsapp;

    if (!whatsapp || !whatsapp.connected) {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "WhatsApp integration is not connected." },
        id
      }, { status: 400 });
    }

    const isSimulated = whatsapp.isSimulated;
    let result: any = null;
    let error: any = null;

    if (isSimulated) {
      // -------------------------------------------------------------
      // SIMULATED MOCK CONNECTION PATH
      // -------------------------------------------------------------
      switch (method) {
        case "whatsapp_get_recent_messages": {
          const allMsgs: any[] = [];
          Object.entries(simulatedMessages).forEach(([jid, msgs]) => {
            if (msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1];
              const contact = MOCK_CONTACTS[jid] || { id: jid, name: jid };
              allMsgs.push({
                chatId: jid,
                chatName: contact.name,
                from: lastMsg.pushName,
                body: lastMsg.message?.conversation || "",
                timestamp: new Date(lastMsg.messageTimestamp * 1000).toISOString(),
                fromMe: lastMsg.key.fromMe
              });
            }
          });
          // Sort by timestamp desc
          allMsgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({ messages: allMsgs }, null, 2)
              }
            ]
          };
          break;
        }

        case "whatsapp_get_chat_history": {
          const chatId = params?.chatId;
          const limit = params?.limit || 20;

          if (!chatId || !simulatedMessages[chatId]) {
            result = { content: [{ type: "text", text: JSON.stringify({ messages: [] }, null, 2) }] };
          } else {
            const history = simulatedMessages[chatId].slice(-limit).map(m => ({
              messageId: m.key.id,
              from: m.pushName,
              body: m.message?.conversation || "",
              timestamp: new Date(m.messageTimestamp * 1000).toISOString(),
              fromMe: m.key.fromMe
            }));

            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ messages: history }, null, 2)
                }
              ]
            };
          }
          break;
        }

        case "whatsapp_send_message": {
          const { to, body } = params || {};
          if (!to || !body) {
            error = { code: -32602, message: "Arguments 'to' and 'body' are required" };
            break;
          }

          let jid = to;
          if (!to.includes("@")) {
            jid = `${to.replace(/[^\d]/g, "")}@s.whatsapp.net`;
          }

          const newMsg = {
            key: { id: `wmsg_sim_${Math.random().toString(36).substring(2, 9)}`, remoteJid: jid, fromMe: true },
            pushName: "Rahul",
            message: { conversation: body },
            messageTimestamp: Math.floor(Date.now() / 1000)
          };

          if (!simulatedMessages[jid]) {
            simulatedMessages[jid] = [];
            // Create contact metadata if missing
            if (!MOCK_CONTACTS[jid]) {
              MOCK_CONTACTS[jid] = { id: jid, name: to, phone: to };
            }
          }
          simulatedMessages[jid].push(newMsg);

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: "WhatsApp message sent successfully (Simulated)",
                  messageId: newMsg.key.id,
                  recipient: jid
                }, null, 2)
              }
            ]
          };
          break;
        }

        case "whatsapp_search_chats": {
          const query = params?.query || "";
          const lowerQuery = query.toLowerCase();

          const foundChats = Object.entries(MOCK_CONTACTS)
            .filter(([jid, contact]) =>
              contact.name.toLowerCase().includes(lowerQuery) ||
              jid.toLowerCase().includes(lowerQuery) ||
              (simulatedMessages[jid] || []).some(m => m.message?.conversation?.toLowerCase().includes(lowerQuery))
            )
            .map(([jid, contact]) => {
              const msgs = simulatedMessages[jid] || [];
              return {
                chatId: jid,
                name: contact.name,
                isGroup: !!contact.isGroup,
                lastMessage: msgs.length > 0 ? msgs[msgs.length - 1].message?.conversation : ""
              };
            });

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({ chats: foundChats }, null, 2)
              }
            ]
          };
          break;
        }

        case "whatsapp_summarize_conversations": {
          const chatId = params?.chatId;
          let summary = "";

          if (chatId) {
            const contact = MOCK_CONTACTS[chatId] || { name: chatId };
            if (chatId === "123456789@s.whatsapp.net") {
              summary = `Sarah Jenkins requested feedback on the NDA terms via email. Rahul replied that he is reviewing them and will finalize within 2 days. Sarah proposed meeting for lunch tomorrow to sync.`;
            } else if (chatId === "987654321@s.whatsapp.net") {
              summary = `Alex Rivera asked if the coffee meeting tomorrow at 4:30 PM is still on. Rahul confirmed the Starbucks location. Alex noted he wants to discuss the technical roadmap and milestones.`;
            } else if (chatId === "111222333@s.whatsapp.net") {
              summary = `John Doe reminded Rahul to submit the Q2 presentation slides by 4:45 PM today. Rahul confirmed compilation is in progress and he will send them shortly.`;
            } else if (chatId === "120363024555555555@g.us") {
              summary = `Marketing Launch Team sync: Alex Rivera asked if slides are ready. Sarah Jenkins reviewed her budget portion and is waiting on Rahul. John Doe confirmed Rahul will send the slides by 4:45 PM today.`;
            } else {
              const msgs = simulatedMessages[chatId] || [];
              summary = `A chat session with ${contact.name} containing ${msgs.length} messages. The conversation includes coordinate updates and general task management.`;
            }
          } else {
            summary = `OmniSync Daily WhatsApp Brief:\n` +
              `1. Sarah Jenkins (Finance): Review NDA terms (needs reply in 2 days) & Lunch tomorrow proposed.\n` +
              `2. Alex Rivera (Tech): Coffee tomorrow at 4:30 PM (Starbucks) to review technical roadmap.\n` +
              `3. John Doe (Acme): Submit Q2 Slides (Due 4:45 PM today).\n` +
              `4. Marketing Launch Team Group: Awaiting slides from Rahul to finalize campaign presentation tomorrow.`;
          }

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({ summary }, null, 2)
              }
            ]
          };
          break;
        }

        case "whatsapp_get_contact_details": {
          const jidOrPhone = params?.jidOrPhone;
          let contact = Object.values(MOCK_CONTACTS).find(c => c.id === jidOrPhone || c.phone === jidOrPhone);

          if (!contact) {
            contact = { id: jidOrPhone, name: jidOrPhone, phone: jidOrPhone };
          }

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify(contact, null, 2)
              }
            ]
          };
          break;
        }

        case "whatsapp_list_groups": {
          const groups = Object.values(MOCK_CONTACTS).filter(c => c.isGroup);
          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({ groups }, null, 2)
              }
            ]
          };
          break;
        }

        case "whatsapp_get_group_messages": {
          const groupId = params?.groupId;
          const limit = params?.limit || 20;

          if (!groupId || !MOCK_CONTACTS[groupId]?.isGroup) {
            error = { code: -32602, message: `Group with ID ${groupId} not found` };
            break;
          }

          const msgs = (simulatedMessages[groupId] || []).slice(-limit).map(m => ({
            messageId: m.key.id,
            from: m.pushName,
            body: m.message?.conversation || "",
            timestamp: new Date(m.messageTimestamp * 1000).toISOString()
          }));

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({ messages: msgs }, null, 2)
              }
            ]
          };
          break;
        }

        case "whatsapp_send_group_messages":
        case "whatsapp_send_group_message": {
          const { groupId, body } = params || {};
          if (!groupId || !body) {
            error = { code: -32602, message: "Arguments 'groupId' and 'body' are required" };
            break;
          }

          if (!MOCK_CONTACTS[groupId]?.isGroup) {
            error = { code: -32602, message: `Group with ID ${groupId} not found` };
            break;
          }

          const newMsg = {
            key: { id: `wmsg_sim_${Math.random().toString(36).substring(2, 9)}`, remoteJid: groupId, fromMe: true },
            pushName: "Rahul",
            message: { conversation: body },
            messageTimestamp: Math.floor(Date.now() / 1000)
          };

          if (!simulatedMessages[groupId]) {
            simulatedMessages[groupId] = [];
          }
          simulatedMessages[groupId].push(newMsg);

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  message: "WhatsApp group message sent successfully (Simulated)",
                  messageId: newMsg.key.id,
                  recipientGroup: groupId
                }, null, 2)
              }
            ]
          };
          break;
        }

        default:
          error = { code: -32601, message: `Method not found: ${method}` };
      }
    } else {
      // -------------------------------------------------------------
      // REAL GMAIL/WHATSAPP CONNECTION PATH (Baileys Client API Calls)
      // -------------------------------------------------------------
      let session = getWhatsAppSession(userId);

      // Auto-restart socket if disconnected in memory but connected in DB
      if (!session) {
        session = await initWhatsAppConnection(userId, whatsapp.phoneNumber);
        // Wait up to 5 seconds for connection to open
        let attempts = 0;
        while (session.status !== "connected" && attempts < 10) {
          await new Promise(r => setTimeout(r, 500));
          attempts++;
        }
      }

      if (session.status !== "connected") {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: { code: -32002, message: `WhatsApp connection is currently ${session.status}. Please check details.` },
          id
        }, { status: 503 });
      }

      const { sock, store } = session;

      switch (method) {
        case "whatsapp_get_recent_messages": {
          const chats = store.chats.slice(0, 20);
          const messages = chats.map((c: any) => {
            const chatMsgs = store.messages[c.id] || [];
            const lastMsg = chatMsgs[chatMsgs.length - 1];
            return {
              chatId: c.id,
              chatName: c.name || c.id,
              from: lastMsg?.pushName || (lastMsg?.key?.fromMe ? "Me" : "System"),
              body: lastMsg?.message?.conversation || lastMsg?.message?.extendedTextMessage?.text || "",
              timestamp: lastMsg?.messageTimestamp ? new Date(lastMsg.messageTimestamp * 1000).toISOString() : new Date().toISOString(),
              fromMe: !!lastMsg?.key?.fromMe
            };
          });

          result = { content: [{ type: "text", text: JSON.stringify({ messages }, null, 2) }] };
          break;
        }

        case "whatsapp_get_chat_history": {
          const chatId = params?.chatId;
          const limit = params?.limit || 20;

          if (!chatId) {
            error = { code: -32602, message: "Argument 'chatId' is required" };
            break;
          }

          const rawMsgs = store.messages[chatId] || [];
          const history = rawMsgs.slice(-limit).map((m: any) => ({
            messageId: m.key?.id,
            from: m.pushName || (m.key?.fromMe ? "Me" : "Unknown"),
            body: m.message?.conversation || m.message?.extendedTextMessage?.text || "",
            timestamp: m.messageTimestamp ? new Date(m.messageTimestamp * 1000).toISOString() : new Date().toISOString(),
            fromMe: !!m.key?.fromMe
          }));

          result = { content: [{ type: "text", text: JSON.stringify({ messages: history }, null, 2) }] };
          break;
        }

        case "whatsapp_send_message": {
          const { to, body } = params || {};
          if (!to || !body) {
            error = { code: -32602, message: "Arguments 'to' and 'body' are required" };
            break;
          }

          let jid = to;
          if (!to.includes("@")) {
            jid = `${to.replace(/[^\d]/g, "")}@s.whatsapp.net`;
          }

          const sent = await sock.sendMessage(jid, { text: body });
          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  messageId: sent.key.id,
                  timestamp: new Date().toISOString()
                }, null, 2)
              }
            ]
          };
          break;
        }

        case "whatsapp_search_chats": {
          const query = params?.query || "";
          const lowerQuery = query.toLowerCase();

          const chats = store.chats
            .filter((c: any) =>
              (c.name || "").toLowerCase().includes(lowerQuery) ||
              c.id.toLowerCase().includes(lowerQuery)
            )
            .map((c: any) => ({
              chatId: c.id,
              name: c.name || c.id,
              isGroup: c.id.endsWith("@g.us")
            }));

          result = { content: [{ type: "text", text: JSON.stringify({ chats }, null, 2) }] };
          break;
        }

        case "whatsapp_summarize_conversations": {
          const chatId = params?.chatId;
          let msgs: any[] = [];

          if (chatId) {
            msgs = store.messages[chatId] || [];
          } else {
            // Get last 15 messages from all chats
            const allChats = store.chats.slice(0, 10);
            allChats.forEach((c: any) => {
              const chatMsgs = store.messages[c.id] || [];
              msgs.push(...chatMsgs.slice(-3));
            });
          }

          // Generate simple summaries from text logs
          const contentSummaries = msgs.map((m: any) => {
            const sender = m.pushName || (m.key?.fromMe ? "Me" : "Contact");
            const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
            return `${sender}: "${text}"`;
          });

          const summary = contentSummaries.length > 0
            ? `Summary of recent logs:\n${contentSummaries.join("\n")}`
            : "No active message logs found to summarize.";

          result = { content: [{ type: "text", text: JSON.stringify({ summary }, null, 2) }] };
          break;
        }

        case "whatsapp_get_contact_details": {
          const jidOrPhone = params?.jidOrPhone;
          if (!jidOrPhone) {
            error = { code: -32602, message: "Argument 'jidOrPhone' is required" };
            break;
          }

          let jid = jidOrPhone;
          if (!jidOrPhone.includes("@")) {
            jid = `${jidOrPhone.replace(/[^\d]/g, "")}@s.whatsapp.net`;
          }

          const contact = store.contacts[jid] || { id: jid };
          result = { content: [{ type: "text", text: JSON.stringify(contact, null, 2) }] };
          break;
        }

        case "whatsapp_list_groups": {
          const groups = store.chats
            .filter((c: any) => c.id.endsWith("@g.us"))
            .map((c: any) => ({
              id: c.id,
              name: c.name || c.id
            }));

          result = { content: [{ type: "text", text: JSON.stringify({ groups }, null, 2) }] };
          break;
        }

        case "whatsapp_get_group_messages": {
          const groupId = params?.groupId;
          const limit = params?.limit || 20;

          if (!groupId || !groupId.endsWith("@g.us")) {
            error = { code: -32602, message: "Argument 'groupId' must end with @g.us" };
            break;
          }

          const rawMsgs = store.messages[groupId] || [];
          const messages = rawMsgs.slice(-limit).map((m: any) => ({
            messageId: m.key?.id,
            from: m.pushName || "Group Contact",
            body: m.message?.conversation || m.message?.extendedTextMessage?.text || "",
            timestamp: m.messageTimestamp ? new Date(m.messageTimestamp * 1000).toISOString() : new Date().toISOString()
          }));

          result = { content: [{ type: "text", text: JSON.stringify({ messages }, null, 2) }] };
          break;
        }

        case "whatsapp_send_group_messages":
        case "whatsapp_send_group_message": {
          const { groupId, body } = params || {};
          if (!groupId || !body) {
            error = { code: -32602, message: "Arguments 'groupId' and 'body' are required" };
            break;
          }

          const sent = await sock.sendMessage(groupId, { text: body });
          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  messageId: sent.key.id,
                  timestamp: new Date().toISOString()
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
      result,
      error,
      responseFrame
    });

  } catch (err: any) {
    console.error("Error in WhatsApp MCP API route:", err);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32603, message: err.message || "Internal Server Error" },
      id: 1
    }, { status: 500 });
  }
}
