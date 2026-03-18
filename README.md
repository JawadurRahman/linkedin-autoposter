# ⚡ LinkedIn AutoPoster

Fully automated LinkedIn posting powered by Claude AI. Generate posts, post instantly, or schedule them — all without copy/paste.

---

## 🚀 Quick Setup (15 minutes)

### Step 1 — Get Your LinkedIn Access Token

1. Go to [https://www.linkedin.com/developers/apps/new](https://www.linkedin.com/developers/apps/new)
2. Create an app (you need a LinkedIn Company Page — create a dummy one if needed)
3. Go to the **Settings** tab → verify your app
4. Go to **Products** tab → add:
   - ✅ Share on LinkedIn
   - ✅ Sign In with LinkedIn using OpenID Connect
5. Go to [https://www.linkedin.com/developers/tools/oauth/token-generator](https://www.linkedin.com/developers/tools/oauth/token-generator)
6. Select your app → check ALL scopes → click **Request access token**
7. Copy the token — it lasts **60 days**

---

### Step 2 — Set Up the Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your Anthropic API key
npm install
npm start
```

The backend runs on **http://localhost:3001**

---

### Step 3 — Set Up the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

### Step 4 — Connect LinkedIn in the App

1. Paste your LinkedIn access token in the "Connect LinkedIn" box
2. Click **Connect** — it will verify and save your credentials
3. You're done! Start posting.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Generation | Claude writes posts based on topic, tone & type |
| 🚀 Post Now | Instantly publish to your LinkedIn profile |
| 📅 Scheduler | Queue posts for any future date/time |
| 📋 History | See all published posts |
| ✏️ Edit Preview | Tweak AI-generated posts before publishing |
| 🔁 Auto-cron | Background job checks every minute for scheduled posts |

---

## 🏗️ Architecture

```
frontend/   → React + Vite UI (port 5173)
backend/    → Express server (port 3001)
  server.js → API routes + LinkedIn integration + cron scheduler
  data.json → Auto-created; stores token, scheduled posts, history
```

---

## ⚠️ Token Renewal

LinkedIn tokens expire after **60 days**. Set a reminder to:
1. Go back to the token generator
2. Get a new token
3. Paste it in the app → Connect

---

## 🔐 Security Notes

- Your token is stored in `backend/data.json` — keep this file private
- Never commit `data.json` or `.env` to git (add to `.gitignore`)
- Run this app locally or on a private server only

---

## 📦 Tech Stack

- **Frontend**: React, Vite
- **Backend**: Node.js, Express
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)
- **Scheduler**: node-cron
- **LinkedIn API**: ugcPosts v2 + userinfo OpenID
