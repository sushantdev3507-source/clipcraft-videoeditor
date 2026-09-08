"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Header({
  navOpen = false,
  onToggleNav,
}: {
  navOpen?: boolean;
  onToggleNav?: () => void;
}) {
  const [query, setQuery] = useState("");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  // Rushikesh's global search shortcut: Ctrl/Cmd + K focuses the search field.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSignOut() {
    signOut();
    void navigate({ to: "/", replace: true });
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="responsive-menu-button"
          aria-label={navOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={navOpen}
          onClick={onToggleNav}
        >
          ☰
        </button>

        <Link to="/workspace" className="brand" aria-label="ClipCraft workspace home">
          <div className="brand-mark">
            <img src="/assets/clipcraft_logo.png" alt="" className="brand-mark-logo" />
          </div>
          <div className="brand-text">
            <span className="brand-name">ClipCraft</span>
            <span className="brand-tagline">Video Editing Studio</span>
          </div>
        </Link>
      </div>

      <div className="header-center">
        <div className="global-search">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={searchRef}
            type="search"
            className="global-search-input"
            placeholder="Search projects, media, templates..."
            aria-label="Search ClipCraft"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="header-right">
        {user ? (
          <button
            type="button"
            className="profile-button"
            aria-label={`Sign out of ${user.name}'s account`}
            title="Sign out"
            onClick={handleSignOut}
          >
            <div className="profile-avatar">{initials(user.name)}</div>
            <div className="profile-details">
              <span className="profile-name">{user.name}</span>
              <span className="profile-plan">Free Plan</span>
            </div>
            <span className="profile-arrow">↪</span>
          </button>
        ) : (
          <Link to="/login" className="profile-button" aria-label="Log in">
            <div className="profile-avatar">CC</div>
            <div className="profile-details">
              <span className="profile-name">Log in</span>
              <span className="profile-plan">Guest</span>
            </div>
            <span className="profile-arrow">▾</span>
          </Link>
        )}
      </div>
    </header>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? "");
  return (letters.join("") || "CC").toUpperCase();
}
