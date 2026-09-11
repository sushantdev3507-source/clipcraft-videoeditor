"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


export default function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const navClass = (path: string) => pathname === path ? "nav-item active" : "nav-item";
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
            href="/workspace"
            className={navClass("/workspace")}
          >
            <span className="nav-icon" aria-hidden="true">
              ⌂
            </span>
            <span className="nav-label">Home</span>
          </Link>

          <Link
            href="/projects"
            className={navClass("/projects")}
          >
            <span className="nav-icon" aria-hidden="true">
              ▣
            </span>
            <span className="nav-label">Projects</span>
          </Link>

          <Link
            href="/templates"
            className={navClass("/templates")}
          >
            <span className="nav-icon" aria-hidden="true">
              ◇
            </span>
            <span className="nav-label">Templates</span>
          </Link>

          <Link
            href="/media"
            className={navClass("/media")}
          >
            <span className="nav-icon" aria-hidden="true">
              ▤
            </span>
            <span className="nav-label">Media Library</span>
          </Link>

          <Link
            href="/entry"
            className={navClass("/entry")}
          >
            <span className="nav-icon" aria-hidden="true">
              ↑
            </span>
            <span className="nav-label">New Project</span>
          </Link>

          <Link
            href="/editor"
            className={navClass("/editor")}
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
            href="/analytics"
            className={navClass("/analytics")}
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
            href="/account"
            className={navClass("/account")}
          >
            <span className="nav-icon" aria-hidden="true">
              ⚙
            </span>
            <span className="nav-label">Account &amp; Settings</span>
          </Link>

          <Link
            href="/help"
            className={navClass("/help")}
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
