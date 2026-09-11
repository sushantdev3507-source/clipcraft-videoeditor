"use client";

// ClipCraft authentication screens.
// Converted from the original auth.js + auth.css modules to React.
// Markup structure (auth-page > auth-brand + auth-container > auth-card),
// copy and class names follow the original build; added: labels, submit/loading
// and success states, password reset screen and post-login redirect.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthBrandPanel from "./AuthBrandPanel";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

type Mode = "login" | "signup" | "forgot";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.6" />
      {off ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="social-icon">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.93a9 9 0 0 0 0 8.1l3.04-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .93 4.95l3.04 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { signIn, signUp, user, ready } = useAuth();
  const searchParams = useSearchParams();
  const search = { redirect: searchParams.get("redirect") ?? undefined };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  // Already signed in? Skip the auth screens.
  useEffect(() => {
    if (ready && user && !isForgot) {
      router.replace("/workspace");
    }
  }, [ready, user, isForgot, router]);

  function validate() {
    const next: FieldErrors = {};

    if (isSignup && name.trim().length < 2) {
      next.name = "Please enter your full name.";
    }
    if (!emailPattern.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!isForgot && password.length < 6) {
      next.password = "Password must be at least 6 characters.";
    }
    if (isSignup && confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match.";
    }
    if (isSignup && !acceptTerms) {
      next.terms = "Please accept the terms to continue.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!validate() || submitting) return;

    // There is no password-reset endpoint yet, so this stays a UI placeholder.
    if (isForgot) {
      setResetSent(true);
      return;
    }

    setSubmitting(true);
    try {
      if (isSignup) {
        await signUp({ name: name.trim(), email: email.trim(), password });
      } else {
        await signIn({ email: email.trim(), password }, remember);
      }

      const target = search.redirect;
      router.replace(
        target && target.startsWith("/") && target !== "/login" ? target : "/workspace",
      );
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      const message =
        error instanceof ApiError
          ? status === 409
            ? "An account with that email already exists."
            : status === 401
              ? "That email and password don't match."
              : error.message
          : "Something went wrong. Please try again.";
      setNotice(message);
      setSubmitting(false);
    }
  }

  const heading = isForgot
    ? "Reset your password"
    : isSignup
      ? "Create your account"
      : "Welcome back";

  const subtitle = isForgot
    ? "Enter your email and we'll send you a reset link."
    : isSignup
      ? "Start editing your videos with ClipCraft."
      : "Log in to continue to your ClipCraft workspace.";

  return (
    <main className="auth-page">
      <AuthBrandPanel />

      <div className="auth-container">
        <section className="auth-card">
          <div className="auth-logo">
            <img src="/assets/clipcraft_logo.png" alt="ClipCraft" className="auth-logo-image" />
          </div>

          <h2>{heading}</h2>
          <p className="auth-subtitle">{subtitle}</p>

          {isForgot && resetSent ? (
            <div className="auth-success" role="status" aria-live="polite">
              <span className="auth-success-icon" aria-hidden="true">
                ✓
              </span>
              <h3>Check your inbox</h3>
              <p>
                If an account exists for <strong>{email.trim()}</strong>, a reset link is on its
                way. Password delivery needs the ClipCraft account service, which is not connected
                yet.
              </p>
              <Link href="/login" className="btn btn-primary auth-submit">
                Back to log in
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate>
                {isSignup ? (
                  <div className="input-box">
                    <label htmlFor="auth-name">Full name</label>
                    <div className="input-field">
                      <span className="input-icon">
                        <UserIcon />
                      </span>
                      <input
                        id="auth-name"
                        type="text"
                        placeholder="Your full name"
                        autoComplete="name"
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? "auth-name-error" : undefined}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    {errors.name ? (
                      <span className="input-error" id="auth-name-error">
                        {errors.name}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <div className="input-box">
                  <label htmlFor="auth-email">Email address</label>
                  <div className="input-field">
                    <span className="input-icon">
                      <MailIcon />
                    </span>
                    <input
                      id="auth-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? "auth-email-error" : undefined}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {errors.email ? (
                    <span className="input-error" id="auth-email-error">
                      {errors.email}
                    </span>
                  ) : null}
                </div>

                {!isForgot ? (
                  <div className="input-box">
                    <label htmlFor="auth-password">Password</label>
                    <div className="input-field">
                      <span className="input-icon">
                        <LockIcon />
                      </span>
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        autoComplete={isSignup ? "new-password" : "current-password"}
                        aria-invalid={errors.password ? true : undefined}
                        aria-describedby={errors.password ? "auth-password-error" : undefined}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        <EyeIcon off={showPassword} />
                      </button>
                    </div>
                    {errors.password ? (
                      <span className="input-error" id="auth-password-error">
                        {errors.password}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {isSignup ? (
                  <div className="input-box">
                    <label htmlFor="auth-confirm">Confirm password</label>
                    <div className="input-field">
                      <span className="input-icon">
                        <LockIcon />
                      </span>
                      <input
                        id="auth-confirm"
                        type={showPassword ? "text" : "password"}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        aria-invalid={errors.confirmPassword ? true : undefined}
                        aria-describedby={errors.confirmPassword ? "auth-confirm-error" : undefined}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    {errors.confirmPassword ? (
                      <span className="input-error" id="auth-confirm-error">
                        {errors.confirmPassword}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {isSignup ? (
                  <div className="terms-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                      />
                      <span>I agree to the ClipCraft Terms and Privacy Policy</span>
                    </label>
                    {errors.terms ? <span className="input-error">{errors.terms}</span> : null}
                  </div>
                ) : null}

                {mode === "login" ? (
                  <div className="auth-options">
                    <label>
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>
                    <Link href="/forgot-password">Forgot password?</Link>
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="btn btn-primary auth-submit"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="button-spinner" aria-hidden="true"></span>
                      {isForgot ? "Sending link…" : isSignup ? "Creating account…" : "Logging in…"}
                    </>
                  ) : isForgot ? (
                    "Send reset link"
                  ) : isSignup ? (
                    "Create Account"
                  ) : (
                    "Log In"
                  )}
                </button>
              </form>

              {!isForgot ? (
                <>
                  <div className="divider">
                    <span>or</span>
                  </div>

                  <div className="social-login">
                    <button
                      type="button"
                      className="btn social-button"
                      onClick={() =>
                        setNotice(
                          "Google sign-in needs the ClipCraft account service to be connected.",
                        )
                      }
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>
                  </div>
                </>
              ) : null}

              {notice ? (
                <p className="auth-notice" role="status" aria-live="polite">
                  {notice}
                </p>
              ) : null}

              <p className="signup-text">
                {isForgot ? (
                  <>
                    Remembered it? <Link href="/login">Back to log in</Link>
                  </>
                ) : isSignup ? (
                  <>
                    Already have an account? <Link href="/login">Log in</Link>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account? <Link href="/signup">Sign up</Link>
                  </>
                )}
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
