# Building an AI Chatbot for Zoom Team Chat

> How I integrated an NLP engine into Zoom's platform using OAuth 2.0, Webhooks, and Cloudflare Tunnel.

---

## The Problem: Information Silos in Enterprise

In large organizations, employees constantly switch between tools to find answers — searching internal wikis, emailing HR, messaging IT support. This context-switching costs an average of **23 minutes** to recover from (University of California, Irvine).

What if employees could ask questions directly in their **existing communication tool** — Zoom — and get instant, AI-powered answers?

That's the idea behind the Zoom AI Chatbot.

---

## Architecture: How It All Connects

Building a Zoom chatbot isn't just writing a bot — it's orchestrating **4 external systems**:

```
Zoom Cloud  ←→  Cloudflare Tunnel  ←→  Express.js  ←→  Maistro NLP
```

### The Challenge: Zoom Can't Reach localhost

Zoom's servers need to send webhook events to your bot. But during development, your bot runs on `http://localhost:5000` — invisible to the internet.

**Solution: Cloudflare Tunnel**

```bash
cloudflared tunnel --url http://localhost:5000
# Output: https://random-name.trycloudflare.com
```

This creates a temporary, encrypted tunnel from Zoom's cloud to your local machine. Every time you restart the tunnel, you get a new URL — which means updating Zoom Marketplace settings each time.

### OAuth 2.0: The Authentication Dance

Zoom uses OAuth 2.0 for bot authentication. The flow:

```
1. User authorizes the bot  →  Zoom sends authorization code to /oauth/callback
2. Bot exchanges code       →  Receives access_token + refresh_token
3. Bot stores token          →  Uses it for all API calls
4. Token expires (~1 hour)  →  Bot auto-refreshes at 55-minute mark
```

The auto-refresh mechanism is critical. Without it, the bot would go silent every hour:

```javascript
// Schedule token refresh before expiration
setInterval(async () => {
    await refreshAccessToken(storedRefreshToken);
    console.log("Token refreshed successfully");
}, 55 * 60 * 1000); // Refresh every 55 minutes
```

---

## The Bot Logic: From Message to Response

When a user sends a message in Zoom Team Chat, here's what happens:

### Step 1: Webhook Event Arrives

Zoom sends a POST request to `/zoom-webhook` with the message payload. The bot filters events:

```javascript
const allowedEvents = [
    "bot_notification",           // User directly messages the bot
    "team_chat.dm_message_posted", // DM in Team Chat
    "team_chat.channel_message_posted"  // Channel message
];

if (!allowedEvents.includes(event)) {
    return res.status(200).json({ status: "ignored" });
}
```

### Step 2: Extract Sender Info

Zoom's webhook payloads vary by event type. The `getSenderInfo()` function normalizes the data:

```javascript
function getSenderInfo(payload) {
    return {
        name: payload.userName || payload.senderName || "Unknown",
        email: payload.userEmail || payload.email || "",
        memberId: payload.memberId || payload.userId || "",
        jid: ensureXmppJid(payload.toJid || payload.userJid || "")
    };
}
```

The `ensureXmppJid()` function ensures every JID ends with `@xmpp.zoom.us` — Zoom's messaging protocol.

### Step 3: Process Through Maistro NLP

The message is forwarded to the Maistro API, which manages **sessions** for conversational context:

```javascript
// Session management: one session per bot instance
async function getOrCreateSession() {
    if (cachedSessionId) return cachedSessionId;
    
    const res = await axios.post(SESSION_URL);
    cachedSessionId = res.data.sessionId;
    return cachedSessionId;
}

// Send message within the session
async function sendMaistroMessage(sessionId, text) {
    const res = await axios.post(
        MESSAGE_URL.replace("{sessionId}", sessionId),
        { question: text }
    );
    return res.data.reply || res.data.answer;
}
```

### Step 4: Fallback Mechanism

If Maistro is unreachable, the bot doesn't crash — it returns a temporary response:

```javascript
try {
    const maistroReply = await sendMaistroMessage(sessionId, message);
    return { reply: maistroReply };
} catch (err) {
    // API down? Return mock response instead of crashing
    return { reply: `Mock yanıt (geçici): ${message}` };
}
```

This is crucial for debugging: if the bot responds with a mock answer, the issue is API-side. If the bot doesn't respond at all, the issue is bot-side.

---

## Zoom Marketplace Configuration

Setting up the Zoom Marketplace app requires careful configuration:

### Required Scopes

| Scope | What It Allows |
|-------|---------------|
| `imchat:bot` | The bot can exist on Zoom Team Chat |
| `message:write:content:admin` | Bot can send messages |
| `message:read:content:admin` | Bot can read incoming messages |

### Required Event Subscriptions

| Event | When It Fires |
|-------|--------------|
| `bot_notification` | User directly invokes the bot |
| `team_chat.dm_message_posted` | Any DM in Team Chat |
| `team_chat.channel_message_posted` | Any channel message |

### The Account ID Problem

When creating a General App on Zoom Marketplace, the Account ID isn't directly visible. To obtain it:

1. Create a temporary **Server-to-Server OAuth App**
2. Copy the Account ID from its App Credentials page
3. Delete the temporary app — it's no longer needed

---

## Testing: 650+ Queries at 95% Accuracy

The chatbot was tested against the **Orientation Chatbot knowledge base**, which contains HR and IT onboarding information:

| Metric | Value |
|--------|-------|
| Total Queries | 650+ |
| Accuracy | 95% |
| Avg Response Time | < 2 seconds |
| Knowledge Base | Orientation (HR & IT) |

The 5% error rate primarily came from:
- Ambiguous questions that could map to multiple topics
- Very specific technical questions outside the knowledge base scope
- Edge cases in Turkish language processing

---

## Lessons Learned

1. **OAuth 2.0 is complex but necessary** — the auto-refresh mechanism was the hardest part to get right, but it's essential for production bots
2. **Cloudflare Tunnel is a game-changer** for local development — no need for deployment during testing
3. **Fallback responses are critical** — during development, the Maistro API was occasionally unreachable; mock responses kept development moving
4. **Session management matters** — creating a new Maistro session per message would be expensive and lose conversational context
5. **Event filtering prevents noise** — without filtering, the bot would process every Zoom event, including irrelevant ones

---

## Deployment Paths

### Internal (Enterprise)
- Admin creates the app under the company's Zoom tenant
- Pre-approves for all employees
- No Marketplace review needed

### Public (Marketplace)
- Requires Privacy Policy, Terms of Use, and security documentation
- Zoom's review team tests the bot with provided credentials
- Must pass both functional and security reviews
- Published as "Listed" (searchable) or "Unlisted" (link-only)

---

*Built with Node.js, Express.js, Zoom API, Maistro NLP, OAuth 2.0, and Cloudflare Tunnel.*

**GitHub:** [github.com/orkun022/Zoom-AI-Chatbot](https://github.com/orkun022/Zoom-AI-Chatbot)
