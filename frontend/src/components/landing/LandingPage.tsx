"use client";

// ClipCraft public landing page.
// Converted from the original landing markup + css/landing.css.).
// Structure, copy and class names are kept from the team build; only React
// wiring, keyboard focus states and responsive behaviour were added.

import { Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";

const features = [
  {
    icon: "✂",
    title: "Precision Trimming",
    description: "Cut, split and trim clips down to the frame with a timeline built for speed.",
  },
  {
    icon: "✦",
    title: "Core Editing Controls",
    description:
      "Trim, split, crop and adjust playback with clear controls built into your workspace.",
  },
  {
    icon: "◈",
    title: "Text & Overlays",
    description:
      "Add titles, lower thirds and callouts with positioning controls that stay readable.",
  },
  {
    icon: "▤",
    title: "Media Library",
    description:
      "Keep every video, image and audio file organised, searchable and ready to drop in.",
  },
  {
    icon: "▥",
    title: "Analytics History",
    description: "Track editing time, exports and project activity across your whole workspace.",
  },
  {
    icon: "↑",
    title: "Export Workflow",
    description: "Choose format and quality options through a clear export interface.",
  },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <Link to="/" className="landing-logo" aria-label="ClipCraft home">
          <img src="/assets/clipcraft_logo.png" alt="" />
          <div>
            <h2>ClipCraft</h2>
            <p>Next-Gen Video Editing</p>
          </div>
        </Link>

        <nav className="landing-nav-links" aria-label="Landing navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link to="/help">Support</Link>
        </nav>

        {user ? (
          <Link to="/workspace" className="landing-signin">
            Go to Workspace
          </Link>
        ) : (
          <Link to="/login" className="landing-signin">
            Sign In
          </Link>
        )}
      </header>

      <section className="landing-hero">
        <div className="hero-content">
          <span className="hero-badge">✦ Browser-based video editing</span>

          <h1>
            Edit videos faster with <span>ClipCraft</span>
          </h1>

          <p className="hero-description">
            ClipCraft is a responsive, browser-based video editor for importing media, previewing
            and editing video, adding text overlays, using essential controls, and preparing
            exports.
          </p>

          <div className="hero-buttons">
            <Link to={user ? "/workspace" : "/signup"} className="hero-primary-btn">
              {user ? "Open Workspace" : "Get Started Free"}
            </Link>
            <a href="#features" className="hero-secondary-btn">
              See Features
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-glow" aria-hidden="true"></div>
          <img
            src="/assets/clipcraft_editor_illustration.png"
            alt="The ClipCraft editor showing a video preview and timeline"
            className="hero-editor-image"
            loading="lazy"
          />
        </div>
      </section>

      <section className="landing-features" id="features">
        <h2>Everything you need to finish the edit</h2>
        <p className="features-subtitle">
          Import media, preview your video, refine it with editing controls, and prepare your
          export.
        </p>

        <div className="features-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-card-icon" aria-hidden="true">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-features" id="how-it-works">
        <h2>Three steps to a finished video</h2>
        <p className="features-subtitle">
          Upload your footage, edit it on the timeline, then export in the format you need.
        </p>

        <div className="features-grid">
          <article className="feature-card">
            <div className="feature-card-icon" aria-hidden="true">
              1
            </div>
            <h3>Upload your media</h3>
            <p>Drop videos, images and audio into your library from any device.</p>
          </article>
          <article className="feature-card">
            <div className="feature-card-icon" aria-hidden="true">
              2
            </div>
            <h3>Edit on the timeline</h3>
            <p>Trim, split, adjust speed and volume, then layer text and crops.</p>
          </article>
          <article className="feature-card">
            <div className="feature-card-icon" aria-hidden="true">
              3
            </div>
            <h3>Prepare your export</h3>
            <p>Choose a format and quality through the export interface.</p>
          </article>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-box">
          <h2>Ready to craft your next video?</h2>
          <p>Create a free ClipCraft account and start editing in your browser today.</p>
          <Link to={user ? "/workspace" : "/signup"} className="hero-primary-btn">
            {user ? "Open Workspace" : "Create Free Account"}
          </Link>
        </div>
      </section>
    </div>
  );
}
