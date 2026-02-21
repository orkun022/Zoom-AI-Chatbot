// zoomService.js
const axios = require("axios");
const qs = require("querystring");
require("dotenv").config();

let storedAccessToken = null;

/** Authorization Code -> Access Token (Zoom OAuth) */
async function getAccessToken(code) {
  const tokenURL = "https://zoom.us/oauth/token";
  const redirect_uri = process.env.ZOOM_REDIRECT_URL;

  const basic = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const data = qs.stringify({
    grant_type: "client_credentials",   // ✅ düzeltildi
    code: code,
    redirect_uri,                       // .env’deki ile authorize URL birebir aynı olmalı
  });

  const res = await axios.post(tokenURL, data, {
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  storedAccessToken = res.data.access_token;
  return res.data; // { access_token, refresh_token, scope, ... }
}

/** (Opsiyonel) Refresh token -> yeni access token */
async function refreshAccessToken(refreshToken) {
  const tokenURL = "https://zoom.us/oauth/token";
  const basic = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const data = qs.stringify({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await axios.post(tokenURL, data, {
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  storedAccessToken = res.data.access_token;
  return res.data;
}

/** USER-BASED: mesaj senin kullanıcı hesabından gider */
async function sendChatMessage(userIdOrMe, message) {
  const accessToken = storedAccessToken || process.env.ZOOM_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Access token yok!");

  const userId = (userIdOrMe || "me").toString(); // "me" kendine DM
  const url = `https://api.zoom.us/v2/chat/users/${userId}/messages`;

  const body = {
    message,
    ...(userId !== "me" ? { to_contact: userId } : {}),
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,      // scope: team_chat:write:user_message
    "Content-Type": "application/json",
  };

  const res = await axios.post(url, body, { headers });
  return res.data;
}

/** BOT-BASED: XMPP JID’ye bot kimliğiyle cevap (webhook akışı) */
async function sendRobotMessage(toJid, text) {
  const accessToken = storedAccessToken || process.env.ZOOM_ACCESS_TOKEN;
  const robotJid = process.env.BOT_JID;
  if (!accessToken) throw new Error("Access token yok!");
  if (!robotJid) throw new Error("BOT_JID yok! (Features > Team Chat Bot)");

  const url = "https://api.zoom.us/v2/im/chat/messages";
  const payload = {
    robot_jid: robotJid,
    to_jid: toJid, // webhook’tan gelen ...@xmpp.zoom.us
    content: {
      head: { text: "Bot Yanıtı" },
      body: [{ type: "message", text }],
    },
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,      // scope: imchat:bot
    "Content-Type": "application/json",
  };

  const res = await axios.post(url, payload, { headers });
  return res.data;
}

module.exports = {
  getAccessToken,
  refreshAccessToken,
  sendChatMessage,    // user-based (isteğe bağlı)
  sendRobotMessage,   // bot-based (webhook için BUNU kullan)
};














