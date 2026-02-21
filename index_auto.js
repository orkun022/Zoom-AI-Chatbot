"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require("querystring");
const dotenv = require("dotenv");

// .env dosyan (ör: .env.auto)
dotenv.config({ path: "./.env.auto" });

const { getBotReply } = require("./botLogic");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

let storedAccessToken = null;  
let tokenExpiryTimeout = null;  

// -----------------------------
// 1) Chatbot token (client_credentials) al/yenile
// -----------------------------
async function getAccessToken() {
  const tokenURL = "https://zoom.us/oauth/token";
  const auth = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const response = await axios.post(
      tokenURL,
      qs.stringify({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    storedAccessToken = response.data.access_token;
    console.log("✅ Chatbot access token alındı.");

    // 55 dakikada bir token yenilemek için
    if (tokenExpiryTimeout) clearTimeout(tokenExpiryTimeout);
    tokenExpiryTimeout = setTimeout(getAccessToken, 3300 * 1000);
  } catch (err) {
    console.error("❌ Token alma hatası:", err.response?.data || err.message);
    if (tokenExpiryTimeout) clearTimeout(tokenExpiryTimeout);
    // hata varsa 30 sn sonra tekrar denenemek için
    tokenExpiryTimeout = setTimeout(getAccessToken, 30 * 1000);
  }
}

// -----------------------------
// 2) Chatbot olarak mesaj gönder (/v2/im/chat/messages)
// -----------------------------
async function sendAsBot(toJid, message) {
  const accessToken = storedAccessToken || (process.env.ZOOM_ACCESS_TOKEN || "").trim();
  if (!accessToken) throw new Error("Chatbot için access token yok!");

  const url = "https://api.zoom.us/v2/im/chat/messages";
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const data = {
    robot_jid: (process.env.BOT_JID || "").trim(),
    to_jid: (toJid || "").trim(),
    account_id: (process.env.ZOOM_ACCOUNT_ID || "").trim(),
    content: {
      head: { text: "Bot Yanıtı" },
      body: [{ type: "message", text: message }],
    },
  };

  try {
    const res = await axios.post(url, data, { headers });
    console.log("✅ (Chatbot) mesaj gönderildi.");
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn("⚠️ Bot token süresi dolmuş, yenileniyor...");
      await getAccessToken();
      return await sendAsBot(toJid, message);
    }
    console.error("❌ (Chatbot) gönderim hatası:", err.response?.data || err.message);
    throw err;
  }
}

// -----------------------------
// Yardımcılar
// -----------------------------
const ensureXmppJid = (id) =>
  id && id.includes("@xmpp.zoom.us") ? id : `${id}@xmpp.zoom.us`;

function pick(...vals) {
  return vals.find(v => typeof v === "string" && v.trim()) || "";
}
function getSenderInfo(payload) {
  const name = pick(
    payload.object?.user_name,
    payload.object?.contact_name,
    payload.object?.operator_name,
    payload.userName
  );
  const email = pick(
    payload.operator,
    payload.object?.operator_email
  );
  const memberId = pick(payload.operator_member_id, payload.object?.operator_member_id);
  const jid = pick(payload.userJid, payload.object?.sender_jid);
  return { name, email, memberId, jid };
}

// -----------------------------
// 3) Healthcheck
// -----------------------------
app.get("/", (_req, res) => res.send("Zoom Bot API aktif 🚀"));

// -----------------------------
// 4) Webhook — SADECE bot_notification'a cevap ver, diğerlerini LOG'la
// -----------------------------
app.post("/zoom-webhook", async (req, res) => {
  console.log("GELEN WEBHOOK:", JSON.stringify(req.body, null, 2));

  const eventType = req.body.event;
  const payload = req.body.payload || {};

  const allowed = [
    "bot_notification",
    "team_chat.dm_message_posted",
    "team_chat.channel_message_posted",
  ];
  if (!allowed.includes(eventType)) {
    return res.status(200).json({ status: "ignored" });
  }

  // Mesaj içeriği
  const message =
    payload.object?.message ||
    payload.message ||
    payload.plainText ||
    payload.cmd ||
    payload.object?.cmd ||
    "";

  // kimlik alanları (log için)
  const toJid = payload.toJid || payload.object?.contact_id || null;
  const toContact = payload.object?.contact_id || null;
  const toChannel = payload.object?.channel_id || null;

  // Gönderen bilgisi 
  const { name, email, memberId, jid } = getSenderInfo(payload);
  const who =
    (name ? `${name}` : "") + (email ? (name ? ` <${email}>` : `${email}`) : "");

  console.log(`🔎 eventType: ${eventType} | toJid: ${toJid} | toContact: ${toContact} | toChannel: ${toChannel}`);
  console.log(`👤 Gönderen: ${who || memberId || jid || "bilinmiyor"}`);
  console.log(`📩 Mesaj: "${message}"`);

  // DM/Kanal olaylarında cevap GÖNDERME 
  if (eventType === "team_chat.dm_message_posted" || eventType === "team_chat.channel_message_posted") {
    return res.status(200).json({ status: "logged_only" });
  }

  // Sadece bot_notification geldiğinde bottan yanıtla
  if (eventType === "bot_notification") {
    try {
      if (!message || !toJid) return res.status(200).json({ status: "missing_data" });
      const jidForSend = ensureXmppJid(toJid);
      const botReply = await getBotReply(message);
      const replyText = botReply?.reply || "👍 Aldım.";
      await sendAsBot(jidForSend, replyText);
      return res.status(200).json({ status: "replied_by_bot" });
    } catch (e) {
      console.error("❌ Gönderim hatası:", e.response?.data || e.message);
      return res.status(500).send("Gönderilemedi: " + (e.response?.data?.message || e.message));
    }
  }

  return res.status(200).json({ status: "ok" });
});

// -----------------------------
// 5) Sunucuyu başlat
// -----------------------------
getAccessToken(); 
app.listen(PORT, () => {
  console.log(`🚀 Sunucu aktif: http://localhost:${PORT}`);
});
