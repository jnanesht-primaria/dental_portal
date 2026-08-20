import React, { useState } from "react";

// Point this at your Flask backend (see backend/app.py).
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SHADE_TABS = ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "D2"];

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign in failed. Try again.");
        return;
      }

      localStorage.setItem("token", data.token);
      if (onLoginSuccess) onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError("Can't reach the server. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dl-wrap">
      <style>{CSS}</style>

      <aside className="dl-side">
        <div className="dl-side-top">
          <span className="dl-mark">◇</span>
          <span className="dl-word">Cusp&nbsp;&amp;&nbsp;Crown</span>
        </div>

        <div className="dl-shades" aria-hidden="true">
          {SHADE_TABS.map((tab, i) => (
            <div
              className="dl-shade-tab"
              key={tab}
              style={{ "--i": i, "--n": SHADE_TABS.length }}
            >
              <span>{tab}</span>
            </div>
          ))}
        </div>

        <p className="dl-side-caption">
          Case management for the modern dental laboratory
        </p>
      </aside>

      <main className="dl-main">
        <form className="dl-form" onSubmit={handleSubmit} noValidate>
          <p className="dl-eyebrow">Lab access</p>
          <h1 className="dl-title">Sign in</h1>
          <p className="dl-sub">Use your technician or front-desk account.</p>

          <label className="dl-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
            />
          </label>

          <label className="dl-field">
            <span>Password</span>
            <div className="dl-password-row">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="dl-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && (
            <p className="dl-error" role="alert">
              {error}
            </p>
          )}

          <button className="dl-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="dl-demo-note">
            Demo credentials — username <code>admin</code>, password{" "}
            <code>Lab@Demo123</code>. Change this account before going live.
          </p>
        </form>
      </main>
    </div>
  );
}

const CSS = `
  .dl-wrap {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(220px, 34%) 1fr;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #F7F5F0;
    color: #2B2B28;
  }
  .dl-side {
    background: #1F3A3D;
    color: #F7F5F0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 40px 32px;
    position: relative;
    overflow: hidden;
  }
  .dl-side-top {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    letter-spacing: 0.04em;
    font-size: 14px;
  }
  .dl-mark { color: #E8B87A; font-size: 18px; }
  .dl-word { font-weight: 600; }

  .dl-shades {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 220px;
    margin: 24px 0;
  }
  .dl-shade-tab {
    flex: 1;
    background: linear-gradient(
      180deg,
      hsl(38, calc(38% - var(--i) * 3%), calc(88% - var(--i) * 6%)) 0%,
      hsl(30, calc(30% - var(--i) * 2%), calc(70% - var(--i) * 6%)) 100%
    );
    border-radius: 3px 3px 0 0;
    height: calc(55% + (var(--i) * 45% / var(--n)));
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 8px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
    animation: dl-rise 0.6s ease both;
    animation-delay: calc(var(--i) * 60ms);
  }
  .dl-shade-tab span {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: rgba(31,58,61,0.75);
    font-weight: 600;
  }
  @keyframes dl-rise {
    from { transform: translateY(12px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dl-shade-tab { animation: none; }
  }

  .dl-side-caption {
    font-size: 14px;
    line-height: 1.5;
    color: rgba(247,245,240,0.75);
    max-width: 30ch;
  }

  .dl-main {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
  }
  .dl-form {
    width: 100%;
    max-width: 360px;
  }
  .dl-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #B0774A;
    margin: 0 0 8px;
  }
  .dl-title {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 32px;
    font-weight: 600;
    margin: 0 0 6px;
    color: #1F3A3D;
  }
  .dl-sub {
    margin: 0 0 28px;
    font-size: 14px;
    color: #5B5B54;
  }
  .dl-field {
    display: block;
    margin-bottom: 18px;
    font-size: 13px;
    font-weight: 600;
    color: #2B2B28;
  }
  .dl-field span { display: block; margin-bottom: 6px; }
  .dl-field input {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 12px;
    border: 1.5px solid #D8D3C7;
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    background: #FFFFFF;
    color: #2B2B28;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .dl-field input:focus {
    border-color: #1F3A3D;
    box-shadow: 0 0 0 3px rgba(31,58,61,0.12);
  }
  .dl-password-row {
    display: flex;
    gap: 8px;
  }
  .dl-password-row input { flex: 1; }
  .dl-toggle {
    border: 1.5px solid #D8D3C7;
    background: #fff;
    border-radius: 8px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 600;
    color: #1F3A3D;
    cursor: pointer;
  }
  .dl-toggle:focus-visible,
  .dl-submit:focus-visible,
  .dl-field input:focus-visible {
    outline: 2px solid #B0774A;
    outline-offset: 2px;
  }
  .dl-error {
    background: #FBEAE5;
    color: #A0402A;
    border: 1px solid #EBBBAA;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    margin: 0 0 16px;
  }
  .dl-submit {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: #1F3A3D;
    color: #F7F5F0;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .dl-submit:hover:not(:disabled) { background: #16292B; }
  .dl-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .dl-demo-note {
    margin-top: 20px;
    font-size: 12px;
    color: #8A8577;
    line-height: 1.5;
  }
  .dl-demo-note code {
    background: #EFEAE0;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace;
  }

  @media (max-width: 720px) {
    .dl-wrap { grid-template-columns: 1fr; }
    .dl-side { display: none; }
  }
`;



