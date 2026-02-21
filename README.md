<div align="center">

# 🤖 Zoom AI Chatbot

### Enterprise Conversational Assistant for Zoom Team Chat

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Zoom](https://img.shields.io/badge/Zoom_API-2D8CFF?style=for-the-badge&logo=zoom&logoColor=white)](https://marketplace.zoom.us/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![OAuth 2.0](https://img.shields.io/badge/OAuth_2.0-EB5424?style=for-the-badge&logo=auth0&logoColor=white)](#)
[![Cloudflare](https://img.shields.io/badge/Cloudflare_Tunnel-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

**95% accuracy** over **650+ test queries** · OAuth 2.0 with auto-refresh · Webhook event handling · NLP-powered responses

</div>

---

## 📋 Overview

An AI-powered chatbot developed for **Zoom Team Chat** that processes user messages through the **Maistro NLP API** and returns context-aware responses in real time. The bot was planned and built to accelerate internal communication by enabling employees to instantly access information directly from the Zoom platform — without leaving the chat window.

### What It Does

1. **User sends a message** in Zoom Team Chat (DM or channel)
2. **Zoom Webhook** delivers the event to the bot's Express.js server
3. **Bot processes** the message — checks for special commands, then forwards to Maistro NLP
4. **Maistro API** analyzes the query and returns an intelligent, context-aware answer
5. **Bot sends the response** back to the user via Zoom's messaging API

### Key Features

| Feature | Description |
|---------|-------------|
| 🧠 **NLP Integration** | Maistro AI engine processes natural language queries with session-based context |
| 🔐 **OAuth 2.0 Auth** | Automatic access token refresh every ~55 minutes — bot never loses connectivity |
| 📡 **Zoom Webhooks** | Handles 3 event types: `bot_notification`, `dm_message_posted`, `channel_message_posted` |
| 🌐 **Cloudflare Tunnel** | Secure HTTPS tunneling from Zoom cloud to local development server |
| 🛡️ **Error Resilience** | Fallback (mock) responses when API is unavailable — service never stops |
| 🔄 **Session Caching** | Persistent Maistro session ID — no redundant session creation per message |
| 📊 **95% Accuracy** | Validated across 650+ queries on the Orientation Chatbot knowledge base |

---

## 🏗️ Architecture

```
                          ┌──────────────────┐
                          │   Zoom Team Chat │
                          │   (User sends    │
                          │    a message)     │
                          └────────┬─────────┘
                                   │ Webhook Event
                                   ▼
┌──────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  Cloudflare  │  HTTPS   │   Express.js     │  HTTP    │   Maistro NLP    │
│   Tunnel     │ ───────► │   Server         │ ───────► │   Engine         │
│              │          │   (index.js)     │          │                  │
│  Maps public │          │                  │          │  - Session mgmt  │
│  URL to      │          │  - Webhook route │          │  - DocumentQA    │
│  localhost   │          │  - OAuth handler │          │  - AI Response   │
└──────────────┘          │  - Event filter  │          └────────┬─────────┘
                          └──────┬───────────┘                   │
                                 │                               │
                          ┌──────▼───────────┐                   │
                          │   botLogic.js     │ ◄────────────────┘
                          │                  │     AI Reply
                          │  - Message parse │
                          │  - Maistro call  │
                          │  - Fallback logic│
                          └──────┬───────────┘
                                 │
                          ┌──────▼───────────┐
                          │  zoomService.js  │
                          │                  │
                          │  - OAuth tokens  │
                          │  - sendRobotMsg  │
                          │  - Token refresh │
                          └──────┬───────────┘
                                 │ Bot Message (XMPP)
                                 ▼
                          ┌──────────────────┐
                          │   Zoom Team Chat │
                          │   (User receives │
                          │    bot response)  │
                          └──────────────────┘
```

---

## 📁 Project Structure

```
Zoom-AI-Chatbot/
├── index.js              # Express server — webhook handler, OAuth callback, event routing
├── botLogic.js           # Bot brain — Maistro session mgmt, message processing, fallback logic
├── zoomService.js        # Zoom API — OAuth token management, bot messaging via XMPP
├── index_auto.js         # Extended version with automatic token refresh timer
├── test-token.js         # Token testing utility
├── package.json          # Dependencies (express, axios, dotenv)
├── .env.example          # Environment variable template (no real credentials)
└── .gitignore            # Excludes .env, node_modules, zoom_tokens.json
```

---

## ⚙️ Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (`cloudflared`)
- A Zoom account with [Marketplace](https://marketplace.zoom.us/) developer access

### 1. Clone & Install

```bash
git clone https://github.com/orkun022/Zoom-AI-Chatbot.git
cd Zoom-AI-Chatbot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable | Source | Description |
|----------|--------|-------------|
| `ZOOM_CLIENT_ID` | Marketplace → App Credentials | OAuth client identifier |
| `ZOOM_CLIENT_SECRET` | Marketplace → App Credentials | OAuth client secret |
| `ZOOM_ACCOUNT_ID` | Create a Server-to-Server OAuth app to obtain this | Account identifier |
| `ZOOM_REDIRECT_URL` | Your Cloudflare URL + `/oauth/callback` | OAuth redirect endpoint |
| `BOT_JID` | Marketplace → Features → Team Chat Subscription | Bot's XMPP identity |
| `WEBHOOK_SECRET` | Marketplace → Features → Access → Token | Webhook verification key |

### 3. Start Cloudflare Tunnel

Open a terminal in the directory where `cloudflared.exe` is located:

```bash
cloudflared tunnel --url http://localhost:5000
```

This generates a temporary public HTTPS URL (e.g., `https://xxx-xxx.trycloudflare.com`).

### 4. Configure Zoom Marketplace

#### Create the App
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/) → **Develop** → **Build App**
2. Select **General App**
3. Under Basic Information, choose **Admin-managed**

#### Set URLs
- **OAuth Redirect URL:** `https://<cloudflare-url>/oauth/callback`
- **Bot Endpoint URL (Team Chat):** `https://<cloudflare-url>/zoom-webhook`

#### Enable Event Subscriptions
Go to **Features → Access → Event Subscriptions** and add:

| Event | Purpose |
|-------|---------|
| `bot_notification` | Bot receives direct commands |
| `team_chat.dm_message_posted` | Bot detects DM messages |
| `team_chat.channel_message_posted` | Bot detects channel messages |

#### Enable Team Chat Surface
Go to **Features → Surface** → Select **Team Chat** → Enable **Team Chat Subscription**

#### Configure Scopes
Go to **Build your app → Scopes** and add:

| Scope | Purpose |
|-------|---------|
| `imchat:bot` | Enables bot functionality on Zoom Team Chat |
| `message:write:content:admin` | Allows sending messages to users/channels |
| `message:read:content:admin` | Allows reading incoming messages |

Optional scopes for extended functionality:
- `team_chat:read:user_message:admin` — Read user messages
- `team_chat:write:user_message:admin` — Send messages on behalf of users
- `team_chat:read:user_channel:admin` — View user channels

### 5. Run the Bot

```bash
node index.js
```

Expected output:
```
✅ Sunucu çalışıyor: http://localhost:5000
```

### 6. Activate in Zoom

1. In Zoom Marketplace → **Add your app** → **Local Test**
2. Click **Add app now** → **Allow** on the permission page
3. The bot will appear under **Apps** in your Zoom client
4. Start chatting with the bot!

---

## 🔄 OAuth 2.0 Token Lifecycle

```
┌─────────────┐    Authorization Code    ┌──────────────┐
│    Zoom      │ ──────────────────────►  │  Express.js  │
│  (OAuth)     │                          │  /oauth/     │
│              │ ◄──────────────────────  │  callback    │
│              │    Access + Refresh      │              │
└─────────────┘         Token            └──────┬───────┘
                                                │
                                         Store in memory
                                                │
                                    ┌───────────▼────────────┐
                                    │  Auto-refresh timer    │
                                    │  (every ~55 minutes)   │
                                    │                        │
                                    │  Token expires: ~1hr   │
                                    │  Refresh at: ~55min    │
                                    │  → No 401 errors       │
                                    └────────────────────────┘
```

Access tokens have a **~1 hour** lifespan. The bot automatically refreshes the token at the **55-minute mark** to ensure uninterrupted API access. Without this, the bot would receive `401 Unauthorized` errors.

---

## 🧠 Bot Logic Flow

```
User Message
     │
     ▼
┌─────────────────────┐
│ Is it "naber"?      │──► YES → Reply: "iyiyim, sen?"
└─────────┬───────────┘
          │ NO
          ▼
┌─────────────────────┐
│ Contains "yardım"?  │──► YES → Reply: guidance message
└─────────┬───────────┘
          │ NO
          ▼
┌─────────────────────┐
│ Send to Maistro NLP │
│ (getOrCreateSession │
│  + sendMessage)     │
└─────────┬───────────┘
          │
     ┌────▼────┐
     │ Success │──► Return Maistro's AI response
     └────┬────┘
          │ Failure
          ▼
┌─────────────────────┐
│ Fallback: mock reply│ ← Ensures bot never goes silent
└─────────────────────┘
```

The fallback mechanism is critical: if Maistro is unreachable, the bot returns a temporary response instead of crashing. This helps distinguish between bot-side and API-side issues during debugging.

---

## 📊 Test Results

| Metric | Value |
|--------|-------|
| Total Questions Tested | **650+** |
| Accuracy Rate | **95%** |
| Knowledge Base | Orientation Chatbot (HR & IT documents) |
| Response Time | Real-time (< 2 seconds) |

---

## 🚀 Deployment Options

### Internal (Enterprise Only)
- App must be created under the company's Zoom Admin account
- Admin pre-approves and distributes to employees via **Add for Others**
- No Marketplace review required

### Public (Zoom Marketplace)
Requires Zoom's official review process:
1. Configure **App Listing** (name, icon, description, Privacy Policy, Terms of Use)
2. Set up **Deauthorization endpoint** and security documentation
3. Submit for **Beta Test** → provide test accounts to Zoom's review team
4. Pass **Functional Review** and **Security Review**
5. App goes live as **Public Listed** or **Unlisted** (link-only access)

---

## 🛠️ Technologies

| Technology | Role |
|-----------|------|
| **Node.js** | Runtime environment |
| **Express.js** | HTTP server and webhook handling |
| **Axios** | HTTP client for Zoom API and Maistro API calls |
| **Zoom OAuth 2.0** | Authentication and access token management |
| **Zoom Webhooks** | Real-time event capture from Team Chat |
| **Maistro NLP API** | AI engine for intelligent, context-aware responses |
| **Cloudflare Tunnel** | HTTPS tunneling for local development |
| **dotenv** | Secure credential management via environment variables |

---

<div align="center">
  <sub>Built with ❤️ for enterprise communication</sub>
</div>
