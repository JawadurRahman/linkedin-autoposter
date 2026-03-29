import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "app.db"));
db.pragma("journal_mode = WAL");

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
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text       TEXT    NOT NULL,
    posted_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS auto_posters (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt        TEXT    NOT NULL,
    time_of_day   TEXT    NOT NULL,
    days_of_week  TEXT    NOT NULL,
    last_run_date TEXT,
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    DEFAULT (datetime('now'))
  );
`);

export function upsertUser({ linkedin_id, name, email, avatar, access_token }) {
  return db.prepare(`
    INSERT INTO users (linkedin_id, name, email, avatar, access_token, updated_at)
    VALUES (@linkedin_id, @name, @email, @avatar, @access_token, datetime('now'))
    ON CONFLICT(linkedin_id) DO UPDATE SET
      name=excluded.name, email=excluded.email, avatar=excluded.avatar,
      access_token=excluded.access_token, updated_at=datetime('now')
    RETURNING *
  `).get({ linkedin_id, name, email, avatar, access_token });
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function createPost(user_id, text) {
  return db.prepare("INSERT INTO posts (user_id, text) VALUES (?, ?) RETURNING *").get(user_id, text);
}

export function getPostsByUser(user_id, limit = 30) {
  return db.prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY posted_at DESC LIMIT ?").all(user_id, limit);
}

export function createAutoPoster({ user_id, prompt, time_of_day, days_of_week }) {
  return db.prepare(`
    INSERT INTO auto_posters (user_id, prompt, time_of_day, days_of_week)
    VALUES (@user_id, @prompt, @time_of_day, @days_of_week) RETURNING *
  `).get({ user_id, prompt, time_of_day, days_of_week });
}

export function getAutoPostersByUser(user_id) {
  return db.prepare("SELECT * FROM auto_posters WHERE user_id = ? AND active = 1 ORDER BY created_at DESC").all(user_id);
}

export function getAutoPosterById(id) {
  return db.prepare("SELECT * FROM auto_posters WHERE id = ?").get(id);
}

// Returns auto-posters that should fire right now
export function getDueAutoPosts(currentTime, currentDay) {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare(`
    SELECT a.*, u.access_token, u.linkedin_id
    FROM auto_posters a
    JOIN users u ON u.id = a.user_id
    WHERE a.active = 1
      AND a.time_of_day = ?
      AND (a.last_run_date IS NULL OR a.last_run_date != ?)
  `).all(currentTime, today).filter(a => {
    const days = JSON.parse(a.days_of_week);
    return days.includes(currentDay);
  });
}

export function updateAutoPostLastRun(id) {
  const today = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE auto_posters SET last_run_date = ? WHERE id = ?").run(today, id);
}

export function deleteAutoPoster(id, user_id) {
  db.prepare("DELETE FROM auto_posters WHERE id = ? AND user_id = ?").run(id, user_id);
}

export default db;
