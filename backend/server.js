import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import cron from "node-cron";
import {
  upsertUser, getUserById,
  createPost, getPostsByUser,
  createScheduledPost, getPendingScheduledPosts,
  getScheduledPostsByUser, updateScheduledPostStatus, deleteScheduledPost,
} from "./db.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const {
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_REDIRECT_URI,
  FRONTEND_URL,
  JWT_SECRET,
} = process.env;

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

// ── LinkedIn API helpers ───────────────────────────────────────────────────────
async function getLinkedInProfile(accessToken) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202210" },
  });
  if (res.ok) return res.json();

  // Fallback to /v2/me
  const res2 = await fetch(
    "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))",
    { headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202210", "X-Restli-Protocol-Version": "2.0.0" } }
  );
  if (!res2.ok) throw new Error(`LinkedIn profile error: ${res2.status}`);
  const me = await res2.json();
  const avatar = me.profilePicture?.["displayImage~"]?.elements?.[0]?.identifiers?.[0]?.identifier || null;
  return { sub: me.id, name: `${me.localizedFirstName} ${me.localizedLastName}`, picture: avatar };
}

async function postToLinkedIn(accessToken, personUrn, text) {
  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202210",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${personUrn}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn post error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function generatePost({ topic, tone, postType, keywords }) {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Generate a LinkedIn post:
- Topic: ${topic}.

Return ONLY the post text, nothing else.`,
    }],
  });
  return msg.content[0].text;
}
//- Tone: ${tone}
// - Type: ${postType}
// - Keywords: ${keywords || "none"}

// Rules:
// - Strong opening hook (don't start with "I")
// - Use line breaks for readability
// - 3-5 relevant hashtags at the end
// - 150-300 words, feel authentic not corporate
// - End with a question or CTA

// ═══════════════════════════════════════════════════════════════════════════════
// OAUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Step 1 — redirect user to LinkedIn login
app.get("/auth/linkedin", (req, res) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    scope: "openid profile email w_member_social",
    state: Math.random().toString(36).slice(2), // CSRF protection
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

// Step 2 — LinkedIn calls back with a code, exchange for access token
app.get("/auth/linkedin/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}?error=linkedin_denied`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    // Fetch their LinkedIn profile
    const profile = await getLinkedInProfile(access_token);

    // Upsert user in DB
    const user = upsertUser({
      linkedin_id: profile.sub,
      name: profile.name,
      email: profile.email || null,
      avatar: profile.picture || null,
      access_token,
    });

    // Issue our own JWT (7 day expiry)
    const appToken = jwt.sign(
      { userId: user.id, name: user.name, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect to frontend with token in URL (frontend stores it)
    res.redirect(`${FRONTEND_URL}/auth/success?token=${appToken}`);
  } catch (e) {
    console.error("OAuth error:", e.message);
    res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
  }
});

// Get current user info
app.get("/auth/me", requireAuth, (req, res) => {
  const user = getUserById(req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST ROUTES (all require auth)
// ═══════════════════════════════════════════════════════════════════════════════

// Generate AI post
app.post("/api/generate", requireAuth, async (req, res) => {
  try {
    const text = await generatePost(req.body);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Post now
app.post("/api/post-now", requireAuth, async (req, res) => {
  const user = getUserById(req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    let text = req.body.text;
    if (!text) text = await generatePost(req.body);

    await postToLinkedIn(user.access_token, user.linkedin_id, text);
    const post = createPost(user.id, text);
    res.json({ success: true, post });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Schedule a post
app.post("/api/schedule", requireAuth, async (req, res) => {
  const { text, topic, tone, post_type, keywords, scheduled_for } = req.body;
  if (!scheduled_for) return res.status(400).json({ error: "scheduled_for required" });

  try {
    const post = createScheduledPost({
      user_id: req.user.userId,
      text: text || null,
      topic: topic || null,
      tone: tone || null,
      post_type: post_type || null,
      keywords: keywords || null,
      scheduled_for,
    });
    res.json({ success: true, post });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get scheduled posts for current user
app.get("/api/schedule", requireAuth, (req, res) => {
  res.json(getScheduledPostsByUser(req.user.userId));
});

// Delete a scheduled post
app.delete("/api/schedule/:id", requireAuth, (req, res) => {
  deleteScheduledPost(Number(req.params.id), req.user.userId);
  res.json({ success: true });
});

// Get post history for current user
app.get("/api/history", requireAuth, (req, res) => {
  res.json(getPostsByUser(req.user.userId));
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRON — fire scheduled posts every minute
// ═══════════════════════════════════════════════════════════════════════════════
cron.schedule("* * * * *", async () => {
  const due = getPendingScheduledPosts();
  for (const post of due) {
    try {
      const text = post.text || (await generatePost({
        topic: post.topic,
        tone: post.tone,
        postType: post.post_type,
        keywords: post.keywords,
      }));
      await postToLinkedIn(post.access_token, post.linkedin_id, text);
      updateScheduledPostStatus(post.id, "posted");
      createPost(post.user_id, text);
      console.log(`✅ Scheduled post ${post.id} published for user ${post.user_id}`);
    } catch (e) {
      updateScheduledPostStatus(post.id, "failed", e.message);
      console.error(`❌ Scheduled post ${post.id} failed:`, e.message);
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔗 LinkedIn OAuth: http://localhost:${PORT}/auth/linkedin`);
});
