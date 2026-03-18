import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3001/api";

const TONES = ["Professional", "Conversational", "Inspirational", "Bold", "Storytelling"];
const POST_TYPES = [
  "Career Win",
  "Industry Insight",
  "Personal Story",
  "Thought Leadership",
  "Product/Launch",
];

// ── tiny helpers ──────────────────────────────────────────────────────────────
const fmt = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ── main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("compose"); // compose | manual | schedule | history
  const [status, setStatus] = useState({ connected: false });
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [connectError, setConnectError] = useState("");

  // manual post state
  const [manualText, setManualText] = useState("");
  const [manualPosting, setManualPosting] = useState(false);
  const [manualResult, setManualResult] = useState(null);

  // compose state
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [postType, setPostType] = useState("Thought Leadership");
  const [keywords, setKeywords] = useState("");
  const [preview, setPreview] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);

  // schedule state
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/status`);
      setStatus(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 15000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // ── connect ──────────────────────────────────────────────────────────────────
  const connect = async () => {
    setConnectError("");
    try {
      const r = await fetch(`${API}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput }),
      });
      const d = await r.json();
      if (!r.ok) {
        setConnectError(d.error);
        return;
      }
      setToken(tokenInput);
      setTokenInput("");
      fetchStatus();
    } catch (e) {
      setConnectError(e.message);
    }
  };

  const disconnect = async () => {
    await fetch(`${API}/disconnect`, { method: "POST" });
    fetchStatus();
  };

  // ── generate ─────────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setPreview("");
    setPostResult(null);
    try {
      const r = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, postType, keywords }),
      });
      const d = await r.json();
      setPreview(d.text || d.error);
    } catch (e) {
      setPreview("Error: " + e.message);
    }
    setGenerating(false);
  };

  // ── post now ─────────────────────────────────────────────────────────────────
  const postNow = async () => {
    if (!status.connected) return;
    setPosting(true);
    setPostResult(null);
    try {
      const r = await fetch(`${API}/post-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: preview, topic, tone, postType, keywords }),
      });
      const d = await r.json();
      if (r.ok) {
        setPostResult({ ok: true, msg: "🎉 Posted to LinkedIn!" });
        setPreview(d.text);
        fetchStatus();
      } else {
        setPostResult({ ok: false, msg: d.error });
      }
    } catch (e) {
      setPostResult({ ok: false, msg: e.message });
    }
    setPosting(false);
  };

  // ── manual post ───────────────────────────────────────────────────────────────
  const postManual = async () => {
    if (!status.connected || !manualText.trim()) return;
    setManualPosting(true);
    setManualResult(null);
    try {
      const r = await fetch(`${API}/post-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: manualText }),
      });
      const d = await r.json();
      if (r.ok) {
        setManualResult({ ok: true, msg: "🎉 Posted to LinkedIn!" });
        setManualText("");
        fetchStatus();
      } else {
        setManualResult({ ok: false, msg: d.error });
      }
    } catch (e) {
      setManualResult({ ok: false, msg: e.message });
    }
    setManualPosting(false);
  };

  // ── schedule ─────────────────────────────────────────────────────────────────
  const schedulePost = async () => {
    if (!scheduleDate || !scheduleTime || !topic.trim()) return;
    setScheduling(true);
    setScheduleResult(null);
    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    try {
      const r = await fetch(`${API}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: preview || null,
          topic,
          tone,
          postType,
          keywords,
          scheduledFor,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setScheduleResult({ ok: true, msg: "✅ Post scheduled!" });
        fetchStatus();
      } else {
        setScheduleResult({ ok: false, msg: d.error });
      }
    } catch (e) {
      setScheduleResult({ ok: false, msg: e.message });
    }
    setScheduling(false);
  };

  const deleteScheduled = async (id) => {
    await fetch(`${API}/schedule/${id}`, { method: "DELETE" });
    fetchStatus();
  };

  // ── styles ────────────────────────────────────────────────────────────────────
  const s = {
    app: {
      minHeight: "100vh",
      background: "#0b0f1a",
      fontFamily: "'DM Sans', sans-serif",
      color: "#e2e8f0",
    },
    topbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 32px",
      height: "64px",
      borderBottom: "1px solid #1a2640",
      background: "#080c16",
    },
    logo: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 800,
      fontSize: "20px",
      letterSpacing: "-0.5px",
      background: "linear-gradient(120deg,#0ea5e9,#38bdf8)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    badge: (ok) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 12px",
      borderRadius: "100px",
      fontSize: "12px",
      background: ok ? "#052e16" : "#1a0a0a",
      border: `1px solid ${ok ? "#166534" : "#3b0000"}`,
      color: ok ? "#4ade80" : "#f87171",
    }),
    main: { maxWidth: "780px", margin: "0 auto", padding: "32px 20px" },
    tabs: {
      display: "flex",
      gap: "2px",
      marginBottom: "28px",
      background: "#0d1424",
      borderRadius: "12px",
      padding: "4px",
    },
    tab: (active) => ({
      flex: 1,
      padding: "10px",
      border: "none",
      borderRadius: "9px",
      background: active ? "#1a2e4a" : "transparent",
      color: active ? "#38bdf8" : "#64748b",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: active ? 600 : 400,
      fontFamily: "'DM Sans', sans-serif",
      transition: "all 0.15s",
    }),
    card: {
      background: "#0d1424",
      border: "1px solid #1a2640",
      borderRadius: "16px",
      padding: "24px",
      marginBottom: "16px",
    },
    label: {
      display: "block",
      fontSize: "11px",
      color: "#475569",
      textTransform: "uppercase",
      letterSpacing: "0.8px",
      marginBottom: "8px",
    },
    input: {
      width: "100%",
      padding: "11px 14px",
      background: "#080c16",
      border: "1px solid #1a2640",
      borderRadius: "10px",
      color: "#e2e8f0",
      fontSize: "14px",
      fontFamily: "'DM Sans', sans-serif",
      outline: "none",
      transition: "border-color 0.2s",
    },
    textarea: {
      width: "100%",
      padding: "12px 14px",
      background: "#080c16",
      border: "1px solid #1a2640",
      borderRadius: "10px",
      color: "#e2e8f0",
      fontSize: "14px",
      fontFamily: "'DM Sans', sans-serif",
      lineHeight: 1.7,
      resize: "vertical",
      outline: "none",
    },
    pills: { display: "flex", flexWrap: "wrap", gap: "6px" },
    pill: (active) => ({
      padding: "6px 14px",
      borderRadius: "100px",
      fontSize: "12px",
      border: `1px solid ${active ? "#0ea5e9" : "#1a2640"}`,
      background: active ? "#0ea5e915" : "transparent",
      color: active ? "#38bdf8" : "#64748b",
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
      transition: "all 0.15s",
    }),
    btnPrimary: {
      padding: "12px 24px",
      borderRadius: "10px",
      border: "none",
      background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
      color: "#fff",
      fontSize: "14px",
      fontWeight: 600,
      fontFamily: "'DM Sans', sans-serif",
      cursor: "pointer",
      transition: "opacity 0.15s, transform 0.1s",
    },
    btnGhost: {
      padding: "10px 18px",
      borderRadius: "10px",
      border: "1px solid #1a2640",
      background: "transparent",
      color: "#64748b",
      fontSize: "13px",
      fontFamily: "'DM Sans', sans-serif",
      cursor: "pointer",
    },
    btnGreen: {
      padding: "12px 24px",
      borderRadius: "10px",
      border: "none",
      background: "linear-gradient(135deg,#059669,#047857)",
      color: "#fff",
      fontSize: "14px",
      fontWeight: 600,
      fontFamily: "'DM Sans', sans-serif",
      cursor: "pointer",
    },
    btnRed: {
      padding: "6px 12px",
      borderRadius: "8px",
      border: "1px solid #3b1f1f",
      background: "#1a0a0a",
      color: "#f87171",
      fontSize: "12px",
      fontFamily: "'DM Sans', sans-serif",
      cursor: "pointer",
    },
  };

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, textarea:focus { border-color: #0ea5e9 !important; }
        button:hover:not(:disabled) { opacity: 0.85; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0b0f1a; }
        ::-webkit-scrollbar-thumb { background: #1a2640; border-radius: 3px; }
      `}</style>

      {/* Top bar */}
      <div style={s.topbar}>
        <span style={s.logo}>⚡ LinkedIn AutoPoster</span>
        {status.connected ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={s.badge(true)}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#4ade80",
                  display: "inline-block",
                }}
              />
              {status.profileName}
            </span>
            <button style={s.btnGhost} onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <span style={s.badge(false)}>● Not connected</span>
        )}
      </div>

      <div style={s.main}>
        {/* Connect panel */}
        {!status.connected && (
          <div style={{ ...s.card, borderColor: "#1e3a5f", marginBottom: "28px" }}>
            <div style={{ marginBottom: "16px" }}>
              <h2
                style={{ fontFamily: "'Syne',sans-serif", fontSize: "18px", marginBottom: "6px" }}
              >
                Connect LinkedIn
              </h2>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>
                Get your access token from{" "}
                <a
                  href="https://www.linkedin.com/developers/tools/oauth/token-generator"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#38bdf8" }}
                >
                  LinkedIn Token Generator
                </a>
                . Select your app → check all scopes → Request token. Tokens last 60 days.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                style={s.input}
                type="password"
                placeholder="Paste your LinkedIn access token..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connect()}
              />
              <button style={s.btnPrimary} onClick={connect} disabled={!tokenInput.trim()}>
                Connect
              </button>
            </div>
            {connectError && (
              <p style={{ color: "#f87171", fontSize: "13px", marginTop: "10px" }}>
                {connectError}
              </p>
            )}
          </div>
        )}

        <div style={s.tabs}>
          {[
            { id: "compose", label: "✨ AI Compose" },
            { id: "manual", label: "✍️ Manual Post" },
            { id: "schedule", label: "📅 Scheduled" },
            { id: "history", label: "📋 History" },
          ].map((t) => (
            <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── COMPOSE TAB ─────────────────────────────────────────────────── */}
        {tab === "compose" && (
          <>
            <div style={s.card}>
              <label style={s.label}>What's your post about?</label>
              <textarea
                style={{ ...s.textarea, marginBottom: "16px" }}
                rows={3}
                placeholder="e.g. Just shipped a feature that reduced load time by 60%..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />

              <label style={s.label}>Post Type</label>
              <div style={{ ...s.pills, marginBottom: "16px" }}>
                {POST_TYPES.map((t) => (
                  <button key={t} style={s.pill(postType === t)} onClick={() => setPostType(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <label style={s.label}>Tone</label>
              <div style={{ ...s.pills, marginBottom: "16px" }}>
                {TONES.map((t) => (
                  <button key={t} style={s.pill(tone === t)} onClick={() => setTone(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <label style={s.label}>Keywords / Hashtags (optional)</label>
              <input
                style={s.input}
                placeholder="e.g. leadership, startup, AI"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <button
                style={{ ...s.btnPrimary, flex: 1 }}
                onClick={generate}
                disabled={generating || !topic.trim()}
              >
                {generating ? "⏳ Generating..." : "✨ Generate Post"}
              </button>
            </div>

            {(preview || generating) && (
              <div style={s.card}>
                <label style={s.label}>Preview</label>
                {generating ? (
                  <p style={{ color: "#38bdf8", fontSize: "14px" }}>Writing your post...</p>
                ) : (
                  <>
                    <textarea
                      style={{ ...s.textarea, marginBottom: "16px" }}
                      rows={10}
                      value={preview}
                      onChange={(e) => setPreview(e.target.value)}
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        style={s.btnGreen}
                        onClick={postNow}
                        disabled={posting || !status.connected}
                        title={!status.connected ? "Connect LinkedIn first" : ""}
                      >
                        {posting ? "Posting..." : "🚀 Post Now"}
                      </button>
                      <button style={s.btnGhost} onClick={generate} disabled={generating}>
                        ↺ Regenerate
                      </button>
                      <span style={{ fontSize: "12px", color: "#475569", marginLeft: "auto" }}>
                        {preview.length} chars
                      </span>
                    </div>
                    {postResult && (
                      <p
                        style={{
                          color: postResult.ok ? "#4ade80" : "#f87171",
                          fontSize: "13px",
                          marginTop: "12px",
                        }}
                      >
                        {postResult.msg}
                      </p>
                    )}
                    {!status.connected && (
                      <p style={{ color: "#f59e0b", fontSize: "12px", marginTop: "8px" }}>
                        ⚠️ Connect LinkedIn above to post
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ── MANUAL POST TAB ─────────────────────────────────────────────── */}
        {tab === "manual" && (
          <>
            <div style={s.card}>
              <h3
                style={{ fontFamily: "'Syne',sans-serif", fontSize: "16px", marginBottom: "6px" }}
              >
                Write & Post Manually
              </h3>
              <p style={{ fontSize: "13px", color: "#475569", marginBottom: "20px" }}>
                Write your post exactly as you want it — no AI involved.
              </p>

              <label style={s.label}>Your Post</label>
              <textarea
                style={{ ...s.textarea, marginBottom: "8px" }}
                rows={10}
                placeholder={`What's on your mind?\n\nShare an update, insight, or announcement directly with your network...`}
                value={manualText}
                onChange={(e) => {
                  setManualText(e.target.value);
                  setManualResult(null);
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: manualText.length > 3000 ? "#f87171" : "#475569",
                  }}
                >
                  {manualText.length} / 3000 characters
                </span>
                {manualText.length > 0 && (
                  <button
                    style={s.btnGhost}
                    onClick={() => {
                      setManualText("");
                      setManualResult(null);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* character bar */}
              <div
                style={{
                  height: "3px",
                  background: "#1a2640",
                  borderRadius: "2px",
                  marginBottom: "20px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: "2px",
                    width: `${Math.min((manualText.length / 3000) * 100, 100)}%`,
                    background:
                      manualText.length > 2700
                        ? "#f87171"
                        : manualText.length > 2000
                          ? "#f59e0b"
                          : "#0ea5e9",
                    transition: "width 0.2s, background 0.2s",
                  }}
                />
              </div>

              <button
                style={{
                  ...s.btnGreen,
                  opacity:
                    !status.connected || !manualText.trim() || manualText.length > 3000 ? 0.4 : 1,
                }}
                onClick={postManual}
                disabled={
                  manualPosting ||
                  !status.connected ||
                  !manualText.trim() ||
                  manualText.length > 3000
                }
              >
                {manualPosting ? "Posting..." : "🚀 Post to LinkedIn"}
              </button>

              {!status.connected && (
                <p style={{ color: "#f59e0b", fontSize: "12px", marginTop: "10px" }}>
                  ⚠️ Connect LinkedIn first
                </p>
              )}
              {manualResult && (
                <p
                  style={{
                    color: manualResult.ok ? "#4ade80" : "#f87171",
                    fontSize: "13px",
                    marginTop: "12px",
                  }}
                >
                  {manualResult.msg}
                </p>
              )}
            </div>

            <div style={{ ...s.card, borderColor: "#1a2e1a", background: "#0a140a" }}>
              <p style={{ fontSize: "12px", color: "#4a6741", lineHeight: 1.7 }}>
                💡 <strong style={{ color: "#6db865" }}>Tips for great LinkedIn posts:</strong>{" "}
                Start with a hook that stops the scroll. Use short paragraphs and line breaks. Add
                3–5 relevant hashtags at the end. Ask a question to drive comments. Keep it under
                1,300 chars for best reach.
              </p>
            </div>
          </>
        )}

        {/* ── SCHEDULE TAB ────────────────────────────────────────────────── */}
        {tab === "schedule" && (
          <>
            <div style={s.card}>
              <h3
                style={{ fontFamily: "'Syne',sans-serif", marginBottom: "16px", fontSize: "16px" }}
              >
                Schedule a New Post
              </h3>
              <label style={s.label}>Topic *</label>
              <textarea
                style={{ ...s.textarea, marginBottom: "16px" }}
                rows={2}
                placeholder="What should the post be about?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label style={s.label}>Date</label>
                  <input
                    type="date"
                    style={s.input}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={s.label}>Time</label>
                  <input
                    type="time"
                    style={s.input}
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>

              <label style={s.label}>Post Type</label>
              <div style={{ ...s.pills, marginBottom: "12px" }}>
                {POST_TYPES.map((t) => (
                  <button key={t} style={s.pill(postType === t)} onClick={() => setPostType(t)}>
                    {t}
                  </button>
                ))}
              </div>
              <label style={s.label}>Tone</label>
              <div style={{ ...s.pills, marginBottom: "16px" }}>
                {TONES.map((t) => (
                  <button key={t} style={s.pill(tone === t)} onClick={() => setTone(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: "12px", color: "#475569", marginBottom: "14px" }}>
                AI will auto-generate the post at the scheduled time unless you paste a custom post
                below.
              </p>

              <label style={s.label}>
                Custom Post Text (optional — leave blank to auto-generate)
              </label>
              <textarea
                style={{ ...s.textarea, marginBottom: "16px" }}
                rows={4}
                placeholder="Or write your own post..."
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
              />

              <button
                style={s.btnPrimary}
                onClick={schedulePost}
                disabled={
                  scheduling || !topic.trim() || !scheduleDate || !scheduleTime || !status.connected
                }
              >
                {scheduling ? "Scheduling..." : "📅 Schedule Post"}
              </button>
              {!status.connected && (
                <p style={{ color: "#f59e0b", fontSize: "12px", marginTop: "8px" }}>
                  ⚠️ Connect LinkedIn to schedule
                </p>
              )}
              {scheduleResult && (
                <p
                  style={{
                    color: scheduleResult.ok ? "#4ade80" : "#f87171",
                    fontSize: "13px",
                    marginTop: "10px",
                  }}
                >
                  {scheduleResult.msg}
                </p>
              )}
            </div>

            <h3
              style={{
                fontFamily: "'Syne',sans-serif",
                fontSize: "15px",
                marginBottom: "12px",
                color: "#94a3b8",
              }}
            >
              Upcoming Posts (
              {(status.scheduledPosts || []).filter((p) => p.status === "pending").length})
            </h3>
            {(status.scheduledPosts || []).filter((p) => p.status === "pending").length === 0 ? (
              <p style={{ color: "#475569", fontSize: "13px" }}>No posts scheduled yet.</p>
            ) : (
              (status.scheduledPosts || [])
                .filter((p) => p.status === "pending")
                .map((p) => (
                  <div
                    key={p.id}
                    style={{
                      ...s.card,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: "14px", marginBottom: "4px" }}>{p.topic}</p>
                      <p style={{ fontSize: "12px", color: "#64748b" }}>
                        {p.postType} · {p.tone} · 📅 {fmt(p.scheduledFor)}
                      </p>
                      {p.text && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#475569",
                            marginTop: "6px",
                            fontStyle: "italic",
                          }}
                        >
                          Custom text saved
                        </p>
                      )}
                    </div>
                    <button style={s.btnRed} onClick={() => deleteScheduled(p.id)}>
                      Delete
                    </button>
                  </div>
                ))
            )}
          </>
        )}

        {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
        {tab === "history" && (
          <>
            <h3
              style={{
                fontFamily: "'Syne',sans-serif",
                fontSize: "15px",
                marginBottom: "16px",
                color: "#94a3b8",
              }}
            >
              Post History
            </h3>
            {(status.history || []).length === 0 ? (
              <p style={{ color: "#475569", fontSize: "13px" }}>No posts published yet.</p>
            ) : (
              (status.history || []).map((p, i) => (
                <div key={i} style={s.card}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#4ade80" }}>✓ Posted</span>
                    <span style={{ fontSize: "12px", color: "#475569" }}>{fmt(p.postedAt)}</span>
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.7,
                      color: "#cbd5e1",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {p.text}
                  </p>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
