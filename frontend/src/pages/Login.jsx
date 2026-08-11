// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const SHADE_TABS = ['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2', 'D2'];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');  // redirect to dashboard
    } catch (err) {
      setError(err.message || "Sign in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dl-wrap">
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
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@dentallab.local"
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
            Demo credentials — email <code>admin@dentallab.local</code>, password{" "}
            <code>Lab@Demo123</code>. Change this account before going live.
          </p>
        </form>
      </main>
    </div>
  );
}