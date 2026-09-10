"use client";


import { useState } from "react";
import AppShell from "@/components/shell/AppShell";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  area: string;
};

// The ClipCraft frontend team. No directory service is connected yet, so this
// list is local sample data.
const seedMembers: Member[] = [
  {
    id: "m1",
    name: "Aditi",
    email: "aditi@clipcraft.app",
    role: "Owner",
    area: "Authentication & Media Library",
  },
  {
    id: "m2",
    name: "Nutan",
    email: "nutan@clipcraft.app",
    role: "Editor",
    area: "Editor Workspace",
  },
  {
    id: "m3",
    name: "Rushikesh",
    email: "rushikesh@clipcraft.app",
    role: "Editor",
    area: "Navigation & Help Centre",
  },
  {
    id: "m4",
    name: "Rupesh",
    email: "rupesh@clipcraft.app",
    role: "Editor",
    area: "Analytics & Responsive",
  },
];

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function TeamPage() {
  const [members] = useState(seedMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");

  function sendInvite() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setInviteNotice("Please enter a valid email address.");
      return;
    }
    setInviteNotice(
      "Invites need the ClipCraft account service, which is not connected yet — nothing was sent.",
    );
  }

  return (
    <AppShell>
      <section className="media-library-header">
        <div>
          <span className="section-eyebrow">TEAM</span>
          <h1>Team</h1>
          <p>Everyone with access to this ClipCraft workspace.</p>
        </div>

        <button
          type="button"
          className="primary-action-button"
          onClick={() => {
            setInviteOpen(true);
            setInviteNotice("");
          }}
        >
          + Invite Member
        </button>
      </section>

      <section className="dashboard-stats">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Members</span>
            <span className="stat-icon">♙</span>
          </div>
          <strong className="stat-value">{members.length}</strong>
          <span className="stat-meta">In this workspace</span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Editors</span>
            <span className="stat-icon">✦</span>
          </div>
          <strong className="stat-value">
            {members.filter((member) => member.role === "Editor").length}
          </strong>
          <span className="stat-meta">Can edit projects</span>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">ACCESS</span>
            <h2>Members</h2>
          </div>
        </div>

        <ul className="team-list">
          {members.map((member) => (
            <li className="team-row" key={member.id}>
              <div className="team-avatar" aria-hidden="true">
                {initials(member.name)}
              </div>
              <div className="team-row-main">
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>
              <span className="team-row-area">{member.area}</span>
              <span className="badge badge-primary">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {inviteOpen ? (
        <div className="modal-overlay is-open">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="inviteTitle">
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">TEAM</span>
                <h2 id="inviteTitle">Invite a teammate</h2>
                <p>They will get access to this workspace.</p>
              </div>
              <button
                type="button"
                className="modal-close-button"
                aria-label="Close invite dialog"
                onClick={() => setInviteOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <label className="modal-label" htmlFor="inviteEmail">
                Email address
              </label>
              <input
                id="inviteEmail"
                type="email"
                className="modal-input"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
              {inviteNotice ? (
                <p className="modal-error" role="status" aria-live="polite">
                  {inviteNotice}
                </p>
              ) : null}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="button button-primary" onClick={sendInvite}>
                Send invite
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}


export default TeamPage;
