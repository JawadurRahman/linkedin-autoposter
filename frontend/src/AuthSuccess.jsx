import { useEffect } from "react";

export default function AuthSuccess() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("app_token", token);
      window.location.href = "/";
    } else {
      window.location.href = "/?error=no_token";
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0b0f1a", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif",
    }}>
      <p style={{ fontSize: "16px", color: "#64748b" }}>Connecting your account...</p>
    </div>
  );
}
