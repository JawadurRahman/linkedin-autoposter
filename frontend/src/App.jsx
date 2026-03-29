import { useState, useEffect, useCallback } from "react";
import AuthSuccess from "./AuthSuccess.jsx";

const API = "http://localhost:3001";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt = (iso) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function getToken() { return localStorage.getItem("app_token"); }
function clearToken() { localStorage.removeItem("app_token"); }
function authHeaders() { return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }; }

const S = {
  app: { minHeight: "100vh", background: "#0b0f1a", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: "64px", borderBottom: "1px solid #1a2640", background: "#080c16" },
  logo: { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", background: "linear-gradient(120deg,#0ea5e9,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  main: { maxWidth: "720px", margin: "0 auto", padding: "32px 20px" },
  card: { background: "#0d1424", border: "1px solid #1a2640", borderRadius: "16px", padding: "24px", marginBottom: "16px" },
  label: { display: "block", fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" },
  input: { width: "100%", padding: "11px 14px", background: "#080c16", border: "1px solid #1a2640", borderRadius: "10px", color: "#e2e8f0", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "12px 14px", background: "#080c16", border: "1px solid #1a2640", borderRadius: "10px", color: "#e2e8f0", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box" },
  tabs: { display: "flex", gap: "2px", marginBottom: "28px", background: "#0d1424", borderRadius: "12px", padding: "4px" },
  tab: (a) => ({ flex: 1, padding: "10px 6px", border: "none", borderRadius: "9px", background: a ? "#1a2e4a" : "transparent", color: a ? "#38bdf8" : "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: a ? 600 : 400, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }),
  btnPrimary: { padding: "12px 24px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#0ea5e9,#0284c7)", color: "#fff", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  btnGhost: { padding: "10px 18px", borderRadius: "10px", border: "1px solid #1a2640", background: "transparent", color: "#64748b", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  btnGreen: { padding: "12px 24px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  btnRed: { padding: "6px 12px", borderRadius: "8px", border: "1px solid #3b1f1f", background: "#1a0a0a", color: "#f87171", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" },
  pill: (a) => ({ padding: "6px 14px", borderRadius: "100px", fontSize: "12px", border: `1px solid ${a ? "#0ea5e9" : "#1a2640"}`, background: a ? "#0ea5e915" : "transparent", color: a ? "#38bdf8" : "#64748b", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }),
};

// ── Login Page ─────────────────────────────────────────────────────────────────
function LoginPage({ error }) {
  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@800&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ width: "100%", maxWidth: "400px", padding: "20px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚡</div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "30px", background: "linear-gradient(120deg,#0ea5e9,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "8px" }}>LinkedIn AutoPoster</h1>
          <p style={{ color: "#475569", fontSize: "14px" }}>AI-powered posts, fully automated.</p>
        </div>

        {error && <div style={{ background: "#1a0a0a", border: "1px solid #3b1f1f", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", color: "#f87171", fontSize: "13px", textAlign: "center" }}>
          {error === "linkedin_denied" ? "LinkedIn login was cancelled." : "Something went wrong. Please try again."}
        </div>}

        <div style={{ ...S.card, padding: "28px" }}>
          <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.7, marginBottom: "24px", textAlign: "center" }}>
            Connect your LinkedIn account to start posting content automatically.
          </p>
          <a href={`${API}/auth/linkedin`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", width: "100%", padding: "14px", borderRadius: "12px", background: "#0a66c2", color: "#fff", fontSize: "15px", fontWeight: 600, fontFamily: "'DM Sans',sans-serif", textDecoration: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            Continue with LinkedIn
          </a>
          <p style={{ color: "#334155", fontSize: "12px", textAlign: "center", marginTop: "16px" }}>We never store your LinkedIn password.</p>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
function MainApp({ user, onLogout }) {
  const [tab, setTab] = useState("compose");

  // Compose
  const [topic, setTopic] = useState("");
  const [preview, setPreview] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);

  // Manual
  const [manualText, setManualText] = useState("");
  const [manualPosting, setManualPosting] = useState(false);
  const [manualResult, setManualResult] = useState(null);

  // Auto-poster
  const [apPrompt, setApPrompt] = useState("");
  const [apTime, setApTime] = useState("09:00");
  const [apDays, setApDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri default
  const [apSaving, setApSaving] = useState(false);
  const [apResult, setApResult] = useState(null);
  const [autoPosters, setAutoPosters] = useState([]);

  // History
  const [history, setHistory] = useState([]);

  const fetchAutoPosters = useCallback(async () => {
    const r = await fetch(`${API}/api/autoposter`, { headers: authHeaders() });
    if (r.ok) setAutoPosters(await r.json());
  }, []);

  const fetchHistory = useCallback(async () => {
    const r = await fetch(`${API}/api/history`, { headers: authHeaders() });
    if (r.ok) setHistory(await r.json());
  }, []);

  useEffect(() => {
    fetchAutoPosters(); fetchHistory();
    const id = setInterval(() => { fetchAutoPosters(); fetchHistory(); }, 15000);
    return () => clearInterval(id);
  }, [fetchAutoPosters, fetchHistory]);

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true); setPreview(""); setPostResult(null);
    try {
      const r = await fetch(`${API}/api/generate`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ topic }) });
      const d = await r.json();
      setPreview(d.text || d.error);
    } catch (e) { setPreview("Error: " + e.message); }
    setGenerating(false);
  };

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

  const postManual = async () => {
    setManualPosting(true); setManualResult(null);
    try {
      const r = await fetch(`${API}/api/post-now`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ text: manualText }) });
      const d = await r.json();
      if (r.ok) { setManualResult({ ok: true, msg: "🎉 Posted!" }); setManualText(""); fetchHistory(); }
      else setManualResult({ ok: false, msg: d.error });
    } catch (e) { setManualResult({ ok: false, msg: e.message }); }
    setManualPosting(false);
  };

  const toggleDay = (d) => setApDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const saveAutoPoster = async () => {
    if (!apPrompt.trim() || !apDays.length) return;
    setApSaving(true); setApResult(null);
    try {
      const r = await fetch(`${API}/api/autoposter`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ prompt: apPrompt, time_of_day: apTime, days_of_week: apDays }) });
      const d = await r.json();
      if (r.ok) { setApResult({ ok: true, msg: "✅ Auto-poster created!" }); setApPrompt(""); fetchAutoPosters(); }
      else setApResult({ ok: false, msg: d.error });
    } catch (e) { setApResult({ ok: false, msg: e.message }); }
    setApSaving(false);
  };

  const deleteAp = async (id) => {
    await fetch(`${API}/api/autoposter/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchAutoPosters();
  };

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input:focus,textarea:focus{border-color:#0ea5e9!important}
        button:hover:not(:disabled){opacity:.85} button:disabled{opacity:.4;cursor:not-allowed}
      `}</style>

      <div style={S.topbar}>
        <span style={S.logo}>⚡ LinkedIn AutoPoster</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user.avatar && <img src={user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />}
          <span style={{ fontSize: "14px", color: "#94a3b8" }}>{user.name}</span>
          <button style={S.btnGhost} onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div style={S.main}>
        <div style={S.tabs}>
          {[["compose","✨ AI Compose"],["manual","✍️ Manual"],["autoposter","🤖 Auto-Post"],["history","📋 History"]].map(([id, label]) => (
            <button key={id} style={S.tab(tab === id)} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {/* ── AI COMPOSE ─────────────────────────────────────────────── */}
        {tab === "compose" && <>
          <div style={S.card}>
            <label style={S.label}>What's your post about?</label>
            <textarea style={{ ...S.textarea, marginBottom: "16px" }} rows={3}
              placeholder="e.g. Just shipped a feature that cut load time by 60%..."
              value={topic} onChange={e => setTopic(e.target.value)} />
            <button style={{ ...S.btnPrimary, width: "100%" }} onClick={generate} disabled={generating || !topic.trim()}>
              {generating ? "⏳ Generating..." : "✨ Generate Post"}
            </button>
          </div>

          {(preview || generating) && <div style={S.card}>
            <label style={S.label}>Preview</label>
            {generating
              ? <p style={{ color: "#38bdf8", fontSize: "14px" }}>Writing your post...</p>
              : <>
                <textarea style={{ ...S.textarea, marginBottom: "16px" }} rows={10} value={preview} onChange={e => setPreview(e.target.value)} />
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button style={S.btnGreen} onClick={postNow} disabled={posting || !preview.trim()}>
                    {posting ? "Posting..." : "🚀 Post Now"}
                  </button>
                  <button style={S.btnGhost} onClick={generate} disabled={generating}>↺ Regenerate</button>
                  <span style={{ marginLeft: "auto", fontSize: "12px", color: "#475569" }}>{preview.length} chars</span>
                </div>
                {postResult && <p style={{ color: postResult.ok ? "#4ade80" : "#f87171", fontSize: "13px", marginTop: "12px" }}>{postResult.msg}</p>}
              </>}
          </div>}
        </>}

        {/* ── MANUAL ─────────────────────────────────────────────────── */}
        {tab === "manual" && <>
          <div style={S.card}>
            <label style={S.label}>Your Post</label>
            <textarea style={{ ...S.textarea, marginBottom: "8px" }} rows={10}
              placeholder="Write your post exactly as you want it..."
              value={manualText} onChange={e => { setManualText(e.target.value); setManualResult(null); }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: manualText.length > 3000 ? "#f87171" : "#475569" }}>{manualText.length} / 3000</span>
              {manualText.length > 0 && <button style={S.btnGhost} onClick={() => { setManualText(""); setManualResult(null); }}>Clear</button>}
            </div>
            <div style={{ height: "3px", background: "#1a2640", borderRadius: "2px", marginBottom: "20px" }}>
              <div style={{ height: "100%", borderRadius: "2px", width: `${Math.min((manualText.length / 3000) * 100, 100)}%`, background: manualText.length > 2700 ? "#f87171" : "#0ea5e9", transition: "width 0.2s" }} />
            </div>
            <button style={S.btnGreen} onClick={postManual} disabled={manualPosting || !manualText.trim() || manualText.length > 3000}>
              {manualPosting ? "Posting..." : "🚀 Post to LinkedIn"}
            </button>
            {manualResult && <p style={{ color: manualResult.ok ? "#4ade80" : "#f87171", fontSize: "13px", marginTop: "12px" }}>{manualResult.msg}</p>}
          </div>
        </>}

        {/* ── AUTO-POSTER ────────────────────────────────────────────── */}
        {tab === "autoposter" && <>
          <div style={S.card}>
            <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "16px", marginBottom: "6px" }}>Create Auto-Poster</h3>
            <p style={{ fontSize: "13px", color: "#475569", marginBottom: "20px", lineHeight: 1.6 }}>
              Set a prompt and schedule — AI generates and posts automatically on the days and time you choose.
            </p>

            <label style={S.label}>Post Prompt</label>
            <textarea style={{ ...S.textarea, marginBottom: "16px" }} rows={3}
              placeholder="e.g. A motivational tip for software developers about productivity and growth"
              value={apPrompt} onChange={e => setApPrompt(e.target.value)} />

            <label style={S.label}>Time of Day</label>
            <input type="time" style={{ ...S.input, marginBottom: "16px", width: "160px" }} value={apTime} onChange={e => setApTime(e.target.value)} />

            <label style={S.label}>Days of Week</label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {DAYS.map((d, i) => (
                <button key={i} style={S.pill(apDays.includes(i))} onClick={() => toggleDay(i)}>{d}</button>
              ))}
            </div>

            <button style={S.btnPrimary} onClick={saveAutoPoster} disabled={apSaving || !apPrompt.trim() || !apDays.length}>
              {apSaving ? "Saving..." : "✅ Create Auto-Poster"}
            </button>
            {apResult && <p style={{ color: apResult.ok ? "#4ade80" : "#f87171", fontSize: "13px", marginTop: "12px" }}>{apResult.msg}</p>}
          </div>

          <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: "15px", marginBottom: "12px", color: "#94a3b8" }}>
            Active Auto-Posters ({autoPosters.length})
          </h3>
          {autoPosters.length === 0
            ? <p style={{ color: "#475569", fontSize: "13px" }}>No auto-posters set up yet.</p>
            : autoPosters.map(ap => (
              <div key={ap.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "14px", marginBottom: "6px", color: "#e2e8f0" }}>{ap.prompt}</p>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>
                    🕐 {ap.time_of_day} &nbsp;·&nbsp; 📅 {ap.days_of_week.map(d => DAYS[d]).join(", ")}
                  </p>
                  {ap.last_run_date && <p style={{ fontSize: "11px", color: "#334155", marginTop: "4px" }}>Last posted: {ap.last_run_date}</p>}
                </div>
                <button style={S.btnRed} onClick={() => deleteAp(ap.id)}>Delete</button>
              </div>
            ))
          }
        </>}

        {/* ── HISTORY ────────────────────────────────────────────────── */}
        {tab === "history" && <>
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
        </>}
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  if (window.location.pathname === "/auth/success") return <AuthSuccess />;

  const urlParams = new URLSearchParams(window.location.search);
  const oauthError = urlParams.get("error");

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => { clearToken(); setLoading(false); });
  }, []);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f1a" }}><p style={{ color: "#475569", fontFamily: "'DM Sans',sans-serif" }}>Loading...</p></div>;
  if (!user) return <LoginPage error={oauthError} />;
  return <MainApp user={user} onLogout={() => { clearToken(); setUser(null); }} />;
}
