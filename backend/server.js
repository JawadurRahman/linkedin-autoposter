import { setDefaultResultOrder, setServers } from "dns";
setDefaultResultOrder("ipv4first");
setServers(["1.1.1.1", "8.8.8.8"]);
import https from "https";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import cron from "node-cron";
import {
  upsertUser, getUserById,
  createPost, getPostsByUser,
  createAutoPoster, getAutoPostersByUser, getAutoPosterById,
  getDueAutoPosts, updateAutoPostLastRun, deleteAutoPoster,
} from "./db.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI, FRONTEND_URL, JWT_SECRET } = process.env;

// ── Native HTTPS (Windows-friendly, no node-fetch) ────────────────────────────
function httpsRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: options.headers || {},
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        json: () => JSON.parse(data),
        text: () => data,
      }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── LinkedIn helpers ───────────────────────────────────────────────────────────
async function getLinkedInProfile(accessToken) {
  const res = await httpsRequest("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202210" },
  });
  if (res.ok) return res.json();

  const res2 = await httpsRequest(
    "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)",
    { headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202210", "X-Restli-Protocol-Version": "2.0.0" } }
  );
  if (!res2.ok) throw new Error(`LinkedIn profile error: ${res2.status}`);
  const me = res2.json();
  return { sub: me.id, name: `${me.localizedFirstName} ${me.localizedLastName}` };
}

async function postToLinkedIn(accessToken, personUrn, text) {
  const bodyStr = JSON.stringify({
    author: `urn:li:person:${personUrn}`,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  });
  const res = await httpsRequest("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyStr),
      "LinkedIn-Version": "202210",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  }, bodyStr);
  if (!res.ok) throw new Error(`LinkedIn post error ${res.status}: ${res.text()}`);
  return res.json();
}

async function generatePost(topic) {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{ role: "user", content: `Generate a LinkedIn post:\n- Topic: ${topic}.\n\nReturn ONLY the post text, nothing else.` }],
  });
  return msg.content[0].text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OAUTH
// ═══════════════════════════════════════════════════════════════════════════════
app.get("/auth/linkedin", (req, res) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    scope: "openid profile email w_member_social",
    state: Math.random().toString(36).slice(2),
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

app.get("/auth/linkedin/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect(`${FRONTEND_URL}?error=linkedin_denied`);
  try {
    const bodyStr = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: LINKEDIN_REDIRECT_URI,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    }).toString();

    const tokenRes = await httpsRequest("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(bodyStr) },
    }, bodyStr);

    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status} ${tokenRes.text()}`);
    const { access_token } = tokenRes.json();
    const profile = await getLinkedInProfile(access_token);
    const user = upsertUser({ linkedin_id: profile.sub, name: profile.name, email: profile.email || null, avatar: profile.picture || null, access_token });
    const appToken = jwt.sign({ userId: user.id, name: user.name, avatar: user.avatar }, JWT_SECRET, { expiresIn: "7d" });
    res.redirect(`${FRONTEND_URL}/auth/success?token=${appToken}`);
  } catch (e) {
    console.error("OAuth error:", e.message);
    res.redirect(`${FRONTEND_URL}?error=oauth_failed&msg=${encodeURIComponent(e.message)}`);
  }
});

app.get("/auth/me", requireAuth, (req, res) => {
  const user = getUserById(req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST NOW
// ═══════════════════════════════════════════════════════════════════════════════
app.post("/api/generate", requireAuth, async (req, res) => {
  try {
    res.json({ text: await generatePost(req.body.topic) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/post-now", requireAuth, async (req, res) => {
  const user = getUserById(req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  try {
    const text = req.body.text || await generatePost(req.body.topic);
    await postToLinkedIn(user.access_token, user.linkedin_id, text);
    res.json({ success: true, post: createPost(user.id, text) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/history", requireAuth, (req, res) => {
  res.json(getPostsByUser(req.user.userId));
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-POSTERS (daily/periodic)
// ═══════════════════════════════════════════════════════════════════════════════

// Create an auto-poster: { prompt, time_of_day "HH:MM", days_of_week [0-6] }
app.post("/api/autoposter", requireAuth, async (req, res) => {
  const { prompt, time_of_day, days_of_week } = req.body;
  if (!prompt || !time_of_day || !days_of_week?.length)
    return res.status(400).json({ error: "prompt, time_of_day, and days_of_week are required" });
  try {
    const ap = createAutoPoster({ user_id: req.user.userId, prompt, time_of_day, days_of_week: JSON.stringify(days_of_week) });
    res.json({ success: true, autoposter: ap });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/autoposter", requireAuth, (req, res) => {
  res.json(getAutoPostersByUser(req.user.userId).map(a => ({ ...a, days_of_week: JSON.parse(a.days_of_week) })));
});

app.delete("/api/autoposter/:id", requireAuth, (req, res) => {
  deleteAutoPoster(Number(req.params.id), req.user.userId);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRON — check every minute for due auto-posters
// ═══════════════════════════════════════════════════════════════════════════════
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const currentDay = now.getDay(); // 0=Sun, 6=Sat

  const due = getDueAutoPosts(currentTime, currentDay);
  for (const ap of due) {
    try {
      const text = await generatePost(ap.prompt);
      await postToLinkedIn(ap.access_token, ap.linkedin_id, text);
      createPost(ap.user_id, text);
      updateAutoPostLastRun(ap.id);
      console.log(`✅ Auto-post ${ap.id} published for user ${ap.user_id}`);
    } catch (e) {
      console.error(`❌ Auto-post ${ap.id} failed:`, e.message);
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
