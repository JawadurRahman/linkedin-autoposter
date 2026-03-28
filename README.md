# ⚡ LinkedIn AutoPoster v2

Multi-user LinkedIn posting app with full OAuth login. Users click "Continue with LinkedIn" — no token copy/pasting required.

---

## 🚀 Setup (one-time, ~15 minutes)

### Step 1 — Add the Redirect URI to your LinkedIn App

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
2. Click your app → **Auth** tab
3. Under **Authorized Redirect URLs**, add:
   ```
   http://localhost:3001/auth/linkedin/callback
   ```
4. Save changes

### Step 2 — Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key
LINKEDIN_CLIENT_ID=your_app_client_id        # from LinkedIn App > Auth tab
LINKEDIN_CLIENT_SECRET=your_app_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3001/auth/linkedin/callback
FRONTEND_URL=http://localhost:5173
JWT_SECRET=pick_any_long_random_string_here
```

Your **Client ID** and **Client Secret** are on the **Auth** tab of your LinkedIn Developer App.

### Step 3 — Start the backend

```bash
cd backend
npm install
npm start
```

### Step 4 — Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — you'll see the login screen.

### Step 5 — Log in

Click **Continue with LinkedIn** → authorize → you're in. Every user who visits your app can do the same.

---

## ✨ How OAuth works

```
User clicks "Continue with LinkedIn"
    → Backend redirects to LinkedIn login
    → User approves your app
    → LinkedIn sends a code to /auth/linkedin/callback
    → Backend exchanges code for access token
    → Backend creates/updates user in database
    → Backend issues a JWT to the frontend
    → User is logged in ✓
```

No manual token generation. Tokens auto-refresh on each login. JWT sessions last 7 days.

---

## 🏗️ Architecture

```
frontend/           React + Vite (port 5173)
backend/
  server.js         Express API + OAuth handler + cron scheduler
  db.js             SQLite schema + query helpers
  app.db            Auto-created SQLite database
  .env              Your secrets (never commit this)
```

### Database tables
- `users` — LinkedIn ID, name, email, avatar, access token
- `posts` — published post history per user
- `scheduled_posts` — pending/posted/failed scheduled posts per user

---

## 🌐 Deploying for multiple users

1. Deploy backend to **Railway**, **Render**, or **Fly.io**
2. Deploy frontend to **Vercel** or **Netlify**
3. Update `.env` with production URLs
4. Add your production callback URL to LinkedIn app's Authorized Redirect URLs:
   ```
   https://your-backend.railway.app/auth/linkedin/callback
   ```
5. Set `FRONTEND_URL` and `LINKEDIN_REDIRECT_URI` to production URLs

That's it — anyone can now sign up via LinkedIn OAuth.

---

## ⚠️ LinkedIn token expiry

LinkedIn access tokens expire after ~60 days. When a user's token expires, they just log in again via the "Continue with LinkedIn" button and it automatically refreshes their token.

---

## 🔐 Security notes

- Never commit `.env` or `app.db` to git — add both to `.gitignore`
- `JWT_SECRET` should be a long random string (32+ characters)
- All API routes require a valid JWT — users can only see/edit their own posts
