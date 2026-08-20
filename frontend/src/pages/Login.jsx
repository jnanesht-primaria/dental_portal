// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

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
      navigate('/');
    } catch (err) {
      setError(err.message || "Sign in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lg-page">
      {/* Ambient background */}
      <div className="lg-bg">
        <div className="lg-orb lg-orb-1" />
        <div className="lg-orb lg-orb-2" />
        <svg className="lg-tooth lg-tooth-a" viewBox="0 0 200 240" aria-hidden="true">
          <path d="M100 8c-22 0-34 12-46 12S28 10 16 10C6 10 0 20 0 34c0 26 10 46 10 78 0 30 8 60 20 76 8 11 16 18 24 18 12 0 14-24 22-24s10 24 22 24c8 0 16-7 24-18 12-16 20-46 20-76 0-32 10-52 10-78 0-14-6-24-16-24-12 0-26 10-38 10-8 0-14-12-18-12z" />
        </svg>
        <svg className="lg-tooth lg-tooth-b" viewBox="0 0 200 240" aria-hidden="true">
          <path d="M100 8c-22 0-34 12-46 12S28 10 16 10C6 10 0 20 0 34c0 26 10 46 10 78 0 30 8 60 20 76 8 11 16 18 24 18 12 0 14-24 22-24s10 24 22 24c8 0 16-7 24-18 12-16 20-46 20-76 0-32 10-52 10-78 0-14-6-24-16-24-12 0-26 10-38 10-8 0-14-12-18-12z" />
        </svg>
        <div className="lg-grid-overlay" />
      </div>

      <div className="lg-shell">
        {/* Logo row above the card */}
        <div className="lg-logo-row">
          <span className="lg-logo-badge">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 3h2v6h6v2h-6v10h-2V11H5V9h6V3z" fill="currentColor" />
            </svg>
          </span>
          <span className="lg-logo-word">Cusp&nbsp;&amp;&nbsp;Crown</span>
        </div>

        {/* Main glass card */}
        <div className="lg-card">
          <div className="lg-card-head">
            <h1 className="lg-title">Welcome back</h1>
            <p className="lg-sub">Sign in to manage your dental lab workflow.</p>
          </div>

          <form className="lg-form" onSubmit={handleSubmit} noValidate>
            <label className="lg-field">
              <span>Email address</span>
              <div className="lg-input-wrap">
                <svg className="lg-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dentallab.local"
                />
              </div>
            </label>

            <label className="lg-field">
              <span>Password</span>
              <div className="lg-input-wrap">
                <svg className="lg-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="lg-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="lg-row-between">
              <label className="lg-remember">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="lg-forgot" onClick={(e) => e.preventDefault()}>
                Forgot password?
              </a>
            </div>

            {error && (
              <p className="lg-error" role="alert">
                {error}
              </p>
            )}

            <button className="lg-submit" type="submit" disabled={loading}>
              {loading ? (
                <span className="lg-spinner" aria-hidden="true" />
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="lg-divider"><span>Demo access</span></div>

          <p className="lg-demo-note">
            Email <code>admin@dentallab.local</code> &nbsp;·&nbsp; Password <code>Lab@Demo123</code>
          </p>
        </div>

        <p className="lg-footer">
          Case management for the modern dental laboratory
        </p>
      </div>
    </div>
  );
}


