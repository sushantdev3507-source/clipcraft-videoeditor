"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import Header from "./Header";
import Sidebar from "./Sidebar";
import RequireAuth from "@/components/auth/RequireAuth";

export default function AppShell({
  children,
  guard = true,
}: {
  children: ReactNode;
  /** Set false for pages that stay reachable when signed out (e.g. Help). */
  guard?: boolean;
}) {
  // Rupesh's mobile sidebar behaviour (responsive.js) as React state.
  const [navOpen, setNavOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    closeNav();
  }, [pathname, closeNav]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNav();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeNav]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", navOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [navOpen]);

  const shell = (
    <div className="app-shell">
      <Header navOpen={navOpen} onToggleNav={() => setNavOpen((open) => !open)} />
      <Sidebar mobileOpen={navOpen} onNavigate={closeNav} />
      <div
        className={`responsive-sidebar-overlay${navOpen ? " is-visible" : ""}`}
        onClick={closeNav}
        aria-hidden="true"
      />
      <main className="main-content">
        <div className="main-content-inner">{children}</div>
      </main>
    </div>
  );

  return guard ? <RequireAuth>{shell}</RequireAuth> : shell;
}
