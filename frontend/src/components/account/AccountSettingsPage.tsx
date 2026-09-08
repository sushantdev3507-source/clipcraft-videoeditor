"use client";

// Account & Settings.
// Was a bare placeholder with no functionality -- this wires up the
// already-existing, already-working backend endpoint (PUT /api/v1/auth/profile,
// exposed here via useAuth().updateProfile) that nothing in the UI ever called.

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export default function AccountSettingsPage() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Keep the form in sync if the user object changes from elsewhere (e.g. a
  // fresh /auth/me on load) -- but never stomp on text the person is mid-edit
  // on, so only resync while nothing's been touched yet.
  useEffect(() => {
    if (!user) return;
    setName((current) => (current === "" ? user.name : current));
    setEmail((current) => (current === "" ? user.email : current));
  }, [user]);

  const dirty = Boolean(user) && (name !== user?.name || email !== user?.email);

  function validate() {
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!emailPattern.test(email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    if (!validate()) return;
    if (!dirty) {
      setNotice({ kind: "success", text: "Nothing to save." });
      return;
    }

    setSaving(true);
    try {
      const changes: { name?: string; email?: string } = {};
      if (name.trim() !== user?.name) changes.name = name.trim();
      if (email.trim() !== user?.email) changes.email = email.trim();
      await updateProfile(changes);
      setNotice({ kind: "success", text: "Your profile has been updated." });
    } catch (err) {
      setNotice({
        kind: "error",
        text:
          err instanceof ApiError
            ? err.message
            : "Could not update your profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setErrors({});
    setNotice(null);
  }

  return (
    <section className="account-settings-page">
      <div className="account-settings-intro">
        <span className="section-eyebrow">SETTINGS</span>
        <h1>Account &amp; Settings</h1>
        <p>Manage the name and email address on your ClipCraft account.</p>
      </div>

      <div className="account-settings-card">
        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <div className="account-field">
            <label htmlFor="account-name">Full name</label>
            <div className="account-field-input">
              <span className="account-field-icon">
                <UserIcon />
              </span>
              <input
                id="account-name"
                type="text"
                placeholder="Your full name"
                autoComplete="name"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "account-name-error" : undefined}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {errors.name ? (
              <span className="account-field-error" id="account-name-error">
                {errors.name}
              </span>
            ) : null}
          </div>

          <div className="account-field">
            <label htmlFor="account-email">Email address</label>
            <div className="account-field-input">
              <span className="account-field-icon">
                <MailIcon />
              </span>
              <input
                id="account-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "account-email-error" : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {errors.email ? (
              <span className="account-field-error" id="account-email-error">
                {errors.email}
              </span>
            ) : null}
          </div>

          {notice ? (
            <p
              className={
                notice.kind === "error"
                  ? "account-settings-notice-error"
                  : "account-settings-notice-success"
              }
            >
              {notice.text}
            </p>
          ) : null}

          <div className="account-settings-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="btn" onClick={handleReset} disabled={saving || !dirty}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
