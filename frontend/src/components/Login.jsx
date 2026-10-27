
import { useState } from "react";

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // UI preview only — real authentication will be connected to FastAPI.
    if (!form.email.trim() || !form.password) return;

    onLogin?.({
      name: form.name.trim() || form.email.split("@")[0],
      email: form.email.trim(),
    });
  };

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">D</div>
          <div>
            <h2>DataVista</h2>
            <span>DATA INTELLIGENCE PLATFORM</span>
          </div>
        </div>

        <div className="auth-visual">
          <div className="auth-chart">
            <div className="auth-chart-top">
              <span>DATA OVERVIEW</span>
              <span className="auth-live-dot">LIVE</span>
            </div>
            <div className="auth-bars">
              {[35, 57, 44, 76, 53, 91, 67, 100, 73, 86].map(
                (height, index) => (
                  <div
                    key={index}
                    className="auth-bar"
                    style={{ height: `${height}%` }}
                  />
                )
              )}
            </div>
            <div className="auth-chart-bottom">
              <span>Explore your data</span>
              <span>✦ AI insights</span>
            </div>
          </div>
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">
            {isSignup ? "CREATE YOUR WORKSPACE" : "WELCOME TO YOUR WORKSPACE"}
          </span>
          <h1>
            {isSignup ? (
              <>Start your <span>data journey.</span></>
            ) : (
              <>Your data. <span>Your insights.</span></>
            )}
          </h1>
          <p>
            {isSignup
              ? "Create your account and bring your data to life."
              : "Sign in to continue exploring your data."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="auth-field">
              <span>Full name</span>
              <input
                name="name"
                type="text"
                placeholder="Enter your name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password-wrap">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={8}
                required
              />
              <button
                className="auth-show-password"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button className="auth-submit" type="submit">
            {isSignup ? "Create account" : "Sign in"}
            <span>↗</span>
          </button>
        </form>

        <div className="auth-switch">
          {isSignup ? "Already have an account?" : "New to DataVista?"}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Sign in" : "Create account"}
          </button>
        </div>

        <div className="auth-footer">
          <span>✦ Built for clearer decisions</span>
          <span>DataVista © 2026</span>
        </div>
      </section>
    </main>
  );
}

export default Login;
