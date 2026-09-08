"use client";

import { Link } from "@tanstack/react-router";

const activeProps = { className: "nav-item active" };
const inactiveProps = { className: "nav-item" };

export default function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <aside
      className={`app-sidebar${mobileOpen ? " is-mobile-open" : ""}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest(".nav-item")) onNavigate?.();
      }}
    >
      <div className="sidebar-header">
        <span className="sidebar-header-title">NAVIGATION</span>
      </div>

      <section className="sidebar-group">
        <h3 className="sidebar-section-title">WORKSPACE</h3>
        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <Link
            to="/workspace"
            activeOptions={{ exact: true }}
            activeProps={activeProps}
            inactiveProps={inactiveProps}
            className="nav-item"
          >
            <span className="nav-icon" aria-hidden="true">
              ⌂
            </span>
            <span className="nav-label">Home</span>
          </Link>

          <Link
            to="/projects"
            activeProps={activeProps}
            inactiveProps={inactiveProps}
            className="nav-item"
          >
            <span className="nav-icon" aria-hidden="true">
              ▣
            </span>
            <span className="nav-label">Projects</span>
          </Link>

          <Link
            to="/templates"
            activeProps={activeProps}
            inactiveProps={inactiveProps}
            className="nav-item"
          >
            <span className="nav-icon" aria-hidden="true">
              ◇
            </span>
            <span className="nav-label">Templates</span>
          </Link>

          <Link
            to="/media"
            activeProps={activeProps}
            inactiveProps={inactiveProps}
            className="nav-item"
          >
            <span className="nav-icon" aria-hidden="true">
              ▤
            </span>
            <span className="nav-label">Media Library</span>
          </Link>

          <Link
            to="/entry"
            activeProps={activeProps}
            inactiveProps={inactiveProps}
            className="nav-item"
          >
            <span className="nav-icon" aria-hidden="true">
              ↑
            </span>
            <span className="nav-label">New Project</span>
          </Link>

          <Link
            to="/editor"
            activeProps={activeProps}
            inactiveProps={inactiveProps}
            className="nav-item"
          >
            <span className="nav-icon" aria-hidden="true">
              ✦
            </span>
            <span className="nav-label">Editor</span>
          </Link>
        </nav>
      </section>

      <section className="sidebar-group">
        <h3 className="sidebar-section-title">ACTIVITY</h3>
        <nav className="sidebar-nav" aria-label="Activity navigation">
          <Link
            to="/analytics"
            activeProps={activeProps}
            inactiveProps={inactiveProps}
            className="nav-item"
          >
            <span className="nav-icon" aria-hidden="true">
              ▥
            </span>
            <span className="nav-label">Analytics History</span>
          </Link>
        </nav>
      </section>

      <section className="sidebar-group sidebar-group-last">
        <h3 className="sidebar-section-title">SETTINGS</h3>
        <nav className="sidebar-nav" aria-label="Settings navigation">
          <Link
            to="/account"
            activeProps={activeProps}
            inactiveProps={inactiveProps}
            className="nav-item"
          >
            <span className="nav-icon" aria-hidden="true">
              ⚙
            </span>
            <span className="nav-label">Account &amp; Settings</span>
          </Link>

          <Link
            to="/help"
            activeProps={activeProps}
            inactiveProps={inactiveProps}
            className="nav-item"
          >
            <span className="nav-icon" aria-hidden="true">
              ?
            </span>
            <span className="nav-label">Help &amp; Support</span>
          </Link>
        </nav>
      </section>

      <div className="sidebar-footer">
        <div className="sidebar-footer-card">
          <div className="sidebar-footer-icon">
            <img src="/assets/clipcraft_logo.png" alt="" />
          </div>
          <div className="sidebar-footer-content">
            <strong>ClipCraft</strong>
            <span>Video editing workspace</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
