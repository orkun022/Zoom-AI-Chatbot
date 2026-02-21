const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();

const { getAccessToken, sendRobotMessage } = require("./zoomService");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Zoom Bot çalışıyor 🚀");
});

 
app.post("/zoom-webhook", async (req, res) => {
  const payload = req.body?.payload || {};
  const message =
    payload?.object?.message ||
    payload?.message ||
    payload?.plainText ||
    payload?.cmd ||
    "";

  const toJid =
    payload?.object?.contact_id ||
    payload?.userJid ||
    payload?.userId ||
    payload?.toJid ||
    "";

  console.log("📩 Yeni mesaj:", message, "| toJid:", toJid);

  if (!message || !toJid) {
    return res.status(200).json({ status: "ignored", note: "missing message/toJid" });
  }

  try {
    await sendRobotMessage(toJid, `Bot yanıtı: ${message}`);
    res.status(200).json({ status: "sent" });
  } catch (e) {
    console.error("Mesaj gönderme hatası:", e.response?.data || e.message);
    res.status(500).send("Hata oluştu");
  }
});

 
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("code parametresi yok!");
  try {
    const tokenData = await getAccessToken(code);
    res.send(`
      <h2>Access token alındı</h2>
      <pre>${tokenData.access_token}</pre>
      <p>Refresh token:</p>
      <pre>${tokenData.refresh_token || "-"}</pre>
    `);
  } catch (e) {
    console.error("Token alınamadı:", e.response?.data || e.message);
    res.status(500).send("Token alınamadı");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
});


















 