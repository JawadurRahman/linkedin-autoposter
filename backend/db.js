import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "app.db"));

// Enable WAL mode for better concurrent performance
db.pragma("journal_mode = WAL");

// ── Schema ─────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    linkedin_id   TEXT    UNIQUE NOT NULL,
    name          TEXT    NOT NULL,
    email         TEXT,
    avatar        TEXT,
    access_token  TEXT    NOT NULL,
    created_at    TEXT    DEFAULT (datetime('now')),
    updated_at    TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text          TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'posted',
    posted_at     TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text          TEXT,
    topic         TEXT,
    tone          TEXT,
    post_type     TEXT,
    keywords      TEXT,
    scheduled_for TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'pending',
    error         TEXT,
    created_at    TEXT    DEFAULT (datetime('now'))
  );
`);

// ── User helpers ───────────────────────────────────────────────────────────────
export function upsertUser({ linkedin_id, name, email, avatar, access_token }) {
  return db.prepare(`
    INSERT INTO users (linkedin_id, name, email, avatar, access_token, updated_at)
    VALUES (@linkedin_id, @name, @email, @avatar, @access_token, datetime('now'))
    ON CONFLICT(linkedin_id) DO UPDATE SET
      name         = excluded.name,
      email        = excluded.email,
      avatar       = excluded.avatar,
      access_token = excluded.access_token,
      updated_at   = datetime('now')
    RETURNING *
  `).get({ linkedin_id, name, email, avatar, access_token });
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

// ── Post helpers ───────────────────────────────────────────────────────────────
export function createPost(user_id, text) {
  return db.prepare(
    "INSERT INTO posts (user_id, text) VALUES (?, ?) RETURNING *"
  ).get(user_id, text);
}

export function getPostsByUser(user_id, limit = 20) {
  return db.prepare(
    "SELECT * FROM posts WHERE user_id = ? ORDER BY posted_at DESC LIMIT ?"
  ).all(user_id, limit);
}

// ── Scheduled post helpers ─────────────────────────────────────────────────────
export function createScheduledPost(data) {
  return db.prepare(`
    INSERT INTO scheduled_posts (user_id, text, topic, tone, post_type, keywords, scheduled_for)
    VALUES (@user_id, @text, @topic, @tone, @post_type, @keywords, @scheduled_for)
    RETURNING *
  `).get(data);
}

export function getPendingScheduledPosts() {
  return db.prepare(`
    SELECT s.*, u.access_token, u.linkedin_id
    FROM scheduled_posts s
    JOIN users u ON u.id = s.user_id
    WHERE s.status = 'pending' AND s.scheduled_for <= datetime('now')
  `).all();
}

export function getScheduledPostsByUser(user_id) {
  return db.prepare(
    "SELECT * FROM scheduled_posts WHERE user_id = ? AND status = 'pending' ORDER BY scheduled_for ASC"
  ).all(user_id);
}

export function updateScheduledPostStatus(id, status, error = null) {
  db.prepare(
    "UPDATE scheduled_posts SET status = ?, error = ? WHERE id = ?"
  ).run(status, error, id);
}

export function deleteScheduledPost(id, user_id) {
  db.prepare(
    "DELETE FROM scheduled_posts WHERE id = ? AND user_id = ?"
  ).run(id, user_id);
}

export default db;
