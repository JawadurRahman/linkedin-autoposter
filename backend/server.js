import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import cron from "node-cron";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Persistent storage (simple JSON file) ─────────────────────────────────────
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { token: null, personUrn: null, scheduledPosts: [], history: [] };
  }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── LinkedIn helpers ───────────────────────────────────────────────────────────
async function getLinkedInProfile(token) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`LinkedIn profile error: ${res.status}`);
  return res.json();
}

async function postToLinkedIn(token, personUrn, text) {
  const body = {
    author: `urn:li:person:${personUrn}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202210",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn post error ${res.status}: ${err}`);
  }
  return res.json();
}

async function generatePost({ topic, tone, postType, keywords }) {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `Generate a LinkedIn post:
- Topic: ${topic}
- Tone: ${tone}
- Type: ${postType}
- Keywords: ${keywords || "none"}

Rules:
- Strong opening hook (don't start with "I")
- Use line breaks for readability
- 3-5 relevant hashtags at the end
- 150-300 words
- Feel authentic, not corporate
- End with a question or CTA

Return ONLY the post text, nothing else.`,
      },
    ],
  });
  return msg.content[0].text;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// Save LinkedIn token + fetch profile
app.post("/api/token", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });
  try {
    const profile = await getLinkedInProfile(token);
    const data = loadData();
    data.token = token;
    data.personUrn = profile.sub;
    data.profileName = profile.name;
    saveData(data);
    res.json({ success: true, name: profile.name, urn: profile.sub });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get current status
app.get("/api/status", (req, res) => {
  const data = loadData();
  res.json({
    connected: !!data.token,
    profileName: data.profileName || null,
    scheduledPosts: data.scheduledPosts || [],
    history: (data.history || []).slice(-20).reverse(),
  });
});

// Generate post (preview)
app.post("/api/generate", async (req, res) => {
  try {
    const text = await generatePost(req.body);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Post immediately
app.post("/api/post-now", async (req, res) => {
  const data = loadData();
  if (!data.token) return res.status(401).json({ error: "Not connected to LinkedIn" });

  try {
    let text = req.body.text;
    if (!text) {
      text = await generatePost(req.body);
    }
    await postToLinkedIn(data.token, data.personUrn, text);
    data.history = data.history || [];
    data.history.push({ text, postedAt: new Date().toISOString(), status: "posted" });
    saveData(data);
    res.json({ success: true, text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Schedule a post
app.post("/api/schedule", async (req, res) => {
  const { text, topic, tone, postType, keywords, scheduledFor } = req.body;
  if (!scheduledFor) return res.status(400).json({ error: "scheduledFor required" });

  const data = loadData();
  data.scheduledPosts = data.scheduledPosts || [];
  data.scheduledPosts.push({
    id: Date.now().toString(),
    text: text || null,
    topic, tone, postType, keywords,
    scheduledFor,
    status: "pending",
  });
  saveData(data);
  res.json({ success: true });
});

// Delete scheduled post
app.delete("/api/schedule/:id", (req, res) => {
  const data = loadData();
  data.scheduledPosts = (data.scheduledPosts || []).filter(p => p.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// Disconnect LinkedIn
app.post("/api/disconnect", (req, res) => {
  const data = loadData();
  data.token = null;
  data.personUrn = null;
  data.profileName = null;
  saveData(data);
  res.json({ success: true });
});

// ── Cron: check scheduled posts every minute ───────────────────────────────────
cron.schedule("* * * * *", async () => {
  const data = loadData();
  if (!data.token || !data.scheduledPosts?.length) return;

  const now = new Date();
  let changed = false;

  for (const post of data.scheduledPosts) {
    if (post.status !== "pending") continue;
    if (new Date(post.scheduledFor) > now) continue;

    try {
      const text = post.text || (await generatePost(post));
      await postToLinkedIn(data.token, data.personUrn, text);
      post.status = "posted";
      data.history = data.history || [];
      data.history.push({ text, postedAt: new Date().toISOString(), status: "posted" });
      console.log(`✅ Scheduled post published: ${post.id}`);
    } catch (e) {
      post.status = "failed";
      post.error = e.message;
      console.error(`❌ Scheduled post failed: ${e.message}`);
    }
    changed = true;
  }

  // Clean up old posted/failed after keeping for 24h
  data.scheduledPosts = data.scheduledPosts.filter(
    p => p.status === "pending" || (Date.now() - new Date(p.scheduledFor).getTime() < 86400000)
  );

  if (changed) saveData(data);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
