import { useState, useEffect, useCallback } from "react";
import AuthSuccess from "./AuthSuccess.jsx";

const API = "http://localhost:3001";
const TONES = ["Professional", "Conversational", "Inspirational", "Bold", "Storytelling"];
const POST_TYPES = ["Career Win", "Industry Insight", "Personal Story", "Thought Leadership", "Product/Launch"];
const fmt = (iso) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ── Auth helpers ───────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem("app_token"); }
function clearToken() { localStorage.removeItem("app_token"); }
function authHeaders() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: "#0b0f1a", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: "64px", borderBottom: "1px solid #1a2640", background: "#080c16" },
  logo: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "-0.5px", background: "linear-gradient(120deg,#0ea5e9,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  main: { maxWidth: "780px", margin: "0 auto", padding: "32px 20px" },
  card: { background: "#0d1424", border: "1px solid #1a2640", borderRadius: "16px", padding: "24px", marginBottom: "16px" },
  label: { display: "block", fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" },
  input: { width: "100%", padding: "11px 14px", background: "#080c16", border: "1px solid #1a2640", borderRadius: "10px", color: "#e2e8f0", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "12px 14px", background: "#080c16", border: "1px solid #1a2640", borderRadius: "10px", color: "#e2e8f0", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" },
  tabs: { display: "flex", gap: "2px", marginBottom: "28px", background: "#0d1424", borderRadius: "12px", padding: "4px" },
  tab: (a) => ({ flex: 1, padding: "10px 6px", border: "none", borderRadius: "9px", background: a ? "#1a2e4a" : "transparent", color: a ? "#38bdf8" : "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: a ? 600 : 400, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }),
  pills: { display: "flex", flexWrap: "wrap", gap: "6px" },
  pill: (a) => ({ padding: "6px 14px", borderRadius: "100px", fontSize: "12px", border: `1px solid ${a ? "#0ea5e9" : "#1a2640"}`, background: a ? "#0ea5e915" : "transparent", color: a ? "#38bdf8" : "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }),
  btnPrimary: { padding: "12px 24px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "#fff", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  btnGhost: { padding: "10px 18px", borderRadius: "10px", border: "1px solid #1a2640", background: "transparent", color: "#64748b", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  btnGreen: { padding: "12px 24px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  btnRed: { padding: "6px 12px", borderRadius: "8px", border: "1px solid #3b1f1f", background: "#1a0a0a", color: "#f87171", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function LoginPage({ error }) {
  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ width: "100%", maxWidth: "420px", padding: "20px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⚡</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "32px", background: "linear-gradient(120deg,#0ea5e9,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px" }}>
            LinkedIn AutoPoster
          </h1>
          <p style={{ color: "#475569", fontSize: "15px" }}>AI-powered posts, fully automated.</p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ background: "#1a0a0a", border: "1px solid #3b1f1f", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", color: "#f87171", fontSize: "13px", textAlign: "center" }}>
            {error === "linkedin_denied" ? "LinkedIn login was cancelled." : "Something went wrong. Please try again."}
          </div>
        )}

        {/* Login card */}
        <div style={{ background: "#0d1424", border: "1px solid #1a2640", borderRadius: "20px", padding: "32px" }}>
          <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.7, marginBottom: "28px", textAlign: "center" }}>
            Connect your LinkedIn account to start generating and posting content automatically.
          </p>

          <a
            href={`${API}/auth/linkedin`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              width: "100%", padding: "14px", borderRadius: "12px",
              background: "#0a66c2", color: "#fff",
              fontSize: "15px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
              textDecoration: "none", transition: "opacity 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            {/* LinkedIn icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Continue with LinkedIn
          </a>

          <p style={{ color: "#334155", fontSize: "12px", textAlign: "center", marginTop: "20px", lineHeight: 1.6 }}>
            You'll be redirected to LinkedIn to authorize this app.<br />
            We never store your LinkedIn password.
          </p>
        </div>

        {/* Features */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "24px" }}>
          {[["✨", "AI writes posts"], ["🚀", "Posts instantly"], ["📅", "Schedules ahead"]].map(([icon, text]) => (
            <div key={text} style={{ background: "#0d1424", border: "1px solid #1a2640", borderRadius: "12px", padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>{icon}</div>
              <div style={{ fontSize: "11px", color: "#475569", lineHeight: 1.4 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP (authenticated)
// ═══════════════════════════════════════════════════════════════════════════════
function MainApp({ user, onLogout }) {
  const [tab, setTab] = useState("compose");

  // Compose state
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [postType, setPostType] = useState("Thought Leadership");
  const [keywords, setKeywords] = useState("");
  const [preview, setPreview] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);

  // Manual post state
  const [manualText, setManualText] = useState("");
  const [manualPosting, setManualPosting] = useState(false);
  const [manualResult, setManualResult] = useState(null);

  // Schedule state
  const [schedTopic, setSchedTopic] = useState("");
  const [schedTone, setSchedTone] = useState("Professional");
  const [schedPostType, setSchedPostType] = useState("Thought Leadership");
  const [schedKeywords, setSchedKeywords] = useState("");
  const [schedText, setSchedText] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [schedResult, setSchedResult] = useState(null);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [history, setHistory] = useState([]);

  const fetchScheduled = useCallback(async () => {
    const r = await fetch(`${API}/api/schedule`, { headers: authHeaders() });
    if (r.ok) setScheduledPosts(await r.json());
  }, []);

  const fetchHistory = useCallback(async () => {
    const r = await fetch(`${API}/api/history`, { headers: authHeaders() });
    if (r.ok) setHistory(await r.json());
  }, []);

  useEffect(() => {
    fetchScheduled();
    fetchHistory();
    const id = setInterval(() => { fetchScheduled(); fetchHistory(); }, 15000);
    return () => clearInterval(id);
  }, [fetchScheduled, fetchHistory]);

  // Generate AI post
  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true); setPreview(""); setPostResult(null);
    try {
      const r = await fetch(`${API}/api/generate`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ topic, tone, postType, keywords }) });
      const d = await r.json();
      setPreview(d.text || d.error);
    } catch (e) { setPreview("Error: " + e.message); }
    setGenerating(false);
  };

  // Post now (AI)
  const postNow = async () => {
    setPosting(true); setPostResult(null);
    try {
      const r = await fetch(`${API}/api/post-now`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ text: preview }) });
      const d = await r.json();
      setPostResult({ ok: r.ok, msg: r.ok ? "🎉 Posted to LinkedIn!" : d.error });
      if (r.ok) fetchHistory();
    } catch (e) { setPostResult({ ok: false, msg: e.message }); }
    setPosting(false);
  };

  // Post now (manual)
  const postManual = async () => {
    setManualPosting(true); setManualResult(null);
    try {
      const r = await fetch(`${API}/api/post-now`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ text: manualText }) });
      const d = await r.json();
      if (r.ok) { setManualResult({ ok: true, msg: "🎉 Posted to LinkedIn!" }); setManualText(""); fetchHistory(); }
      else setManualResult({ ok: false, msg: d.error });
    } catch (e) { setManualResult({ ok: false, msg: e.message }); }
    setManualPosting(false);
  };

  // Schedule
  const schedulePost = async () => {
    if (!schedDate || !schedTime) return;
    setScheduling(true); setSchedResult(null);
    const scheduled_for = new Date(`${schedDate}T${schedTime}`).toISOString();
    try {
      const r = await fetch(`${API}/api/schedule`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ text: schedText || null, topic: schedTopic, tone: schedTone, post_type: schedPostType, keywords: schedKeywords, scheduled_for }),
      });
      const d = await r.json();
      if (r.ok) { setSchedResult({ ok: true, msg: "✅ Post scheduled!" }); fetchScheduled(); setSchedTopic(""); setSchedText(""); setSchedDate(""); setSchedTime(""); }
      else setSchedResult({ ok: false, msg: d.error });
    } catch (e) { setSchedResult({ ok: false, msg: e.message }); }
    setScheduling(false);
  };

  const deleteScheduled = async (id) => {
    await fetch(`${API}/api/schedule/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchScheduled();
  };

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, textarea:focus { border-color: #0ea5e9 !important; }
        button:hover:not(:disabled) { opacity: 0.85; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0b0f1a; } ::-webkit-scrollbar-thumb { background: #1a2640; border-radius: 3px; }
      `}</style>

      {/* Topbar */}
      <div style={S.topbar}>
        <span style={S.logo}>⚡ LinkedIn AutoPoster</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user.avatar && <img src={user.avatar} alt="" style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #1a2640" }} />}
          <span style={{ fontSize: "14px", color: "#94a3b8" }}>{user.name}</span>
          <button style={S.btnGhost} onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div style={S.main}>
        {/* Tabs */}
        <div style={S.tabs}>
          {[["compose","✨ AI Compose"],["manual","✍️ Manual"],["schedule","📅 Schedule"],["history","📋 History"]].map(([id, label]) => (
            <button key={id} style={S.tab(tab === id)} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {/* ── AI COMPOSE ───────────────────────────────────────────────── */}
        {tab === "compose" && (
          <>
            <div style={S.card}>
              <label style={S.label}>What's your post about?</label>
              <textarea style={{ ...S.textarea, marginBottom: "16px" }} rows={3}
                placeholder="e.g. Just shipped a feature that cut load time by 60%..."
                value={topic} onChange={e => setTopic(e.target.value)} />
{/* 
              <label style={S.label}>Post Type</label>
              <div style={{ ...S.pills, marginBottom: "16px" }}>
                {POST_TYPES.map(t => <button key={t} style={S.pill(postType === t)} onClick={() => setPostType(t)}>{t}</button>)}
              </div>

              <label style={S.label}>Tone</label>
              <div style={{ ...S.pills, marginBottom: "16px" }}>
                {TONES.map(t => <button key={t} style={S.pill(tone === t)} onClick={() => setTone(t)}>{t}</button>)}
              </div>

              <label style={S.label}>Keywords (optional)</label>
              <input style={S.input} placeholder="e.g. leadership, startup, AI"
                value={keywords} onChange={e => setKeywords(e.target.value)} /> */}
            </div>

            <button style={{ ...S.btnPrimary, width: "100%", marginBottom: "16px" }}
              onClick={generate} disabled={generating || !topic.trim()}>
              {generating ? "⏳ Generating..." : "✨ Generate Post"}
            </button>

            {(preview || generating) && (
              <div style={S.card}>
                <label style={S.label}>Preview</label>
                {generating ? (
                  <p style={{ color: "#38bdf8", fontSize: "14px" }}>Writing your post...</p>
                ) : (
                  <>
                    <textarea style={{ ...S.textarea, marginBottom: "16px" }} rows={10}
                      value={preview} onChange={e => setPreview(e.target.value)} />
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                      <button style={S.btnGreen} onClick={postNow} disabled={posting || !preview.trim()}>
                        {posting ? "Posting..." : "🚀 Post Now"}
                      </button>
                      <button style={S.btnGhost} onClick={generate} disabled={generating}>↺ Regenerate</button>
                      <span style={{ marginLeft: "auto", fontSize: "12px", color: "#475569" }}>{preview.length} chars</span>
                    </div>
                    {postResult && <p style={{ color: postResult.ok ? "#4ade80" : "#f87171", fontSize: "13px", marginTop: "12px" }}>{postResult.msg}</p>}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ── MANUAL POST ──────────────────────────────────────────────── */}
        {tab === "manual" && (
          <>
            <div style={S.card}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "16px", marginBottom: "6px" }}>Write & Post Manually</h3>
              <p style={{ fontSize: "13px", color: "#475569", marginBottom: "20px" }}>Write your post exactly as you want it — no AI involved.</p>

              <label style={S.label}>Your Post</label>
              <textarea style={{ ...S.textarea, marginBottom: "8px" }} rows={10}
                placeholder={"What's on your mind?\n\nShare an update, insight, or announcement..."}
                value={manualText} onChange={e => { setManualText(e.target.value); setManualResult(null); }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: manualText.length > 3000 ? "#f87171" : "#475569" }}>{manualText.length} / 3000</span>
                {manualText.length > 0 && <button style={S.btnGhost} onClick={() => { setManualText(""); setManualResult(null); }}>Clear</button>}
              </div>

              <div style={{ height: "3px", background: "#1a2640", borderRadius: "2px", marginBottom: "20px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "2px", width: `${Math.min((manualText.length / 3000) * 100, 100)}%`, background: manualText.length > 2700 ? "#f87171" : manualText.length > 2000 ? "#f59e0b" : "#0ea5e9", transition: "width 0.2s" }} />
              </div>

              <button style={S.btnGreen} onClick={postManual}
                disabled={manualPosting || !manualText.trim() || manualText.length > 3000}>
                {manualPosting ? "Posting..." : "🚀 Post to LinkedIn"}
              </button>
              {manualResult && <p style={{ color: manualResult.ok ? "#4ade80" : "#f87171", fontSize: "13px", marginTop: "12px" }}>{manualResult.msg}</p>}
            </div>

            <div style={{ ...S.card, borderColor: "#1a2e1a", background: "#0a140a" }}>
              <p style={{ fontSize: "12px", color: "#4a6741", lineHeight: 1.7 }}>
                💡 <strong style={{ color: "#6db865" }}>Tips:</strong> Start with a hook. Use short paragraphs. Add 3–5 hashtags at the end. Ask a question to drive comments. Keep it under 1,300 chars for best reach.
              </p>
            </div>
          </>
        )}

        {/* ── SCHEDULE ─────────────────────────────────────────────────── */}
        {tab === "schedule" && (
          <>
            <div style={S.card}>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "16px", marginBottom: "16px" }}>Schedule a Post</h3>

              <label style={S.label}>Topic *</label>
              <textarea style={{ ...S.textarea, marginBottom: "16px" }} rows={2}
                placeholder="What should the post be about?"
                value={schedTopic} onChange={e => setSchedTopic(e.target.value)} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div><label style={S.label}>Date</label><input type="date" style={S.input} value={schedDate} onChange={e => setSchedDate(e.target.value)} /></div>
                <div><label style={S.label}>Time</label><input type="time" style={S.input} value={schedTime} onChange={e => setSchedTime(e.target.value)} /></div>
              </div>
{/* 
              <label style={S.label}>Post Type</label>
              <div style={{ ...S.pills, marginBottom: "12px" }}>
                {POST_TYPES.map(t => <button key={t} style={S.pill(schedPostType === t)} onClick={() => setSchedPostType(t)}>{t}</button>)}
              </div>
              <label style={S.label}>Tone</label>
              <div style={{ ...S.pills, marginBottom: "16px" }}>
                {TONES.map(t => <button key={t} style={S.pill(schedTone === t)} onClick={() => setSchedTone(t)}>{t}</button>)}
              </div> */}

              {/* <label style={S.label}>Custom Post Text (optional — blank = AI generates at posting time)</label>
              <textarea style={{ ...S.textarea, marginBottom: "16px" }} rows={4}
                placeholder="Or write your own post..."
                value={schedText} onChange={e => setSchedText(e.target.value)} /> */}

              <button style={S.btnPrimary} onClick={schedulePost}
                disabled={scheduling || !schedTopic.trim() || !schedDate || !schedTime}>
                {scheduling ? "Scheduling..." : "📅 Schedule Post"}
              </button>
              {schedResult && <p style={{ color: schedResult.ok ? "#4ade80" : "#f87171", fontSize: "13px", marginTop: "10px" }}>{schedResult.msg}</p>}
            </div>

            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "15px", marginBottom: "12px", color: "#94a3b8" }}>
              Upcoming ({scheduledPosts.length})
            </h3>
            {scheduledPosts.length === 0
              ? <p style={{ color: "#475569", fontSize: "13px" }}>No posts scheduled yet.</p>
              : scheduledPosts.map(p => (
                <div key={p.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "14px", marginBottom: "4px" }}>{p.topic || "Custom post"}</p>
                    <p style={{ fontSize: "12px", color: "#64748b" }}>{p.post_type} · {p.tone} · 📅 {fmt(p.scheduled_for)}</p>
                    {p.text && <p style={{ fontSize: "12px", color: "#475569", marginTop: "4px", fontStyle: "italic" }}>Custom text saved</p>}
                  </div>
                  <button style={S.btnRed} onClick={() => deleteScheduled(p.id)}>Delete</button>
                </div>
              ))
            }
          </>
        )}

        {/* ── HISTORY ──────────────────────────────────────────────────── */}
        {tab === "history" && (
          <>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "15px", marginBottom: "16px", color: "#94a3b8" }}>Post History</h3>
            {history.length === 0
              ? <p style={{ color: "#475569", fontSize: "13px" }}>No posts published yet.</p>
              : history.map(p => (
                <div key={p.id} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#4ade80" }}>✓ Posted</span>
                    <span style={{ fontSize: "12px", color: "#475569" }}>{fmt(p.posted_at)}</span>
                  </div>
                  <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>{p.text}</p>
                </div>
              ))
            }
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — handles routing between login / auth callback / app
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle /auth/success route
  if (window.location.pathname === "/auth/success") {
    return <AuthSuccess />;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const oauthError = urlParams.get("error");

  const logout = () => {
    clearToken();
    setUser(null);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => { clearToken(); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f1a" }}>
        <p style={{ color: "#475569", fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
      </div>
    );
  }

  if (!user) return <LoginPage error={oauthError} />;
  return <MainApp user={user} onLogout={logout} />;
}
