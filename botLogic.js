// botLogic.js
const axios = require("axios");

// Read from .env; fallback to placeholder URLs (replace with your actual Maistro endpoint)
const SESSION_URL =
  process.env.MAISTRO_SESSION_URL ||
  "https://your-nlp-api.example.com/api/v1/agent/label/YOUR_LABEL/session";

const MESSAGE_URL_TMPL =
  process.env.MAISTRO_MESSAGE_URL ||
  "https://your-nlp-api.example.com/api/v1/session/{sessionId}/message";

// Basit cache: tek session
let cachedSessionId = null;

// index.js'e dokunmadan sabit bir kullanıcı tanımlayıcı kullanıyoruz
const USER_IDENT = "zoom_default_user";


async function getOrCreateSession() {
  if (cachedSessionId) return cachedSessionId;

  const url = `${SESSION_URL}?x-rly-user-identifier=${encodeURIComponent(USER_IDENT)}`;

  const headers = { "Content-Type": "application/json" };



  const res = await axios.post(url, null, { headers, timeout: 15000 });
  const data = res.data || {};

  const sessionId =
    data.sessionId ||
    data.id ||
    data.session_id ||
    (data.result && (data.result.sessionId || data.result.id));

  if (!sessionId) {
    throw new Error(
      "Maistro sessionId alınamadı: " + JSON.stringify(data).slice(0, 800)
    );
  }

  cachedSessionId = String(sessionId);
  return cachedSessionId;
}

/** Mesaj gönder – DocumentQA tipi için uygun şema + doğru cevap alanı */
async function sendMaistroMessage(sessionId, text) {
  const url = MESSAGE_URL_TMPL.replace(
    "{sessionId}",
    encodeURIComponent(sessionId)
  );

  const headers = {
    "Content-Type": "application/json",
    "x-rly-user-identifier": USER_IDENT,
  };


  const body = { question: String(text) };

  const res = await axios.post(url, body, { headers, timeout: 20000 });
  const data = res.data || {};

  // Maistro'nun döndürdüğü gerçek alan 
  const reply =
    data.reply ||
    data.answer ||
    data.message ||
    data.agent_response ||
    (data.result &&
      (data.result.reply || data.result.answer || data.result.message)) ||
    (Array.isArray(data.messages) && data.messages[0]?.content);

  if (!reply) {
    throw new Error(
      "Maistro yanıt alanı bulunamadı: " +
      JSON.stringify(data).slice(0, 800)
    );
  }

  return String(reply);
}

/** Dışarıya sunulan bot mantığı */
async function getBotReply(userMessage) {
  const msg = (userMessage || "").toLowerCase().trim();


  if (msg === "naber") return { reply: "iyiyim, sen?" };
  if (msg.includes("yardım")) {
    return { reply: "Sorunu yaz, Maistro’ya ileteyim." };
  }

  try {
    const sessionId = await getOrCreateSession();
    const maistroReply = await sendMaistroMessage(sessionId, userMessage);
    return { reply: maistroReply };
  } catch (err) {
    console.error("Maistro hata:", err.response?.data || err.message);
    // Maistro cevap vermezse mock cevap
    return { reply: `Mock yanıt (geçici): ${userMessage}` };
  }
}

module.exports = { getBotReply };
