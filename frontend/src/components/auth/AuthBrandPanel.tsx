export default function AuthBrandPanel() {
  return (
    <section className="auth-brand">
      <div className="brand-logo">
        <img src="/assets/clipcraft_logo.png" alt="ClipCraft Logo" className="brand-logo-image" />
        <div>
          <h1>ClipCraft</h1>
          <p>Next-Gen Video Editing</p>
        </div>
      </div>

      <div className="brand-content">
        <h2>
          Edit. Create.
          <br />
          <span>Inspire.</span>
        </h2>

        <p className="brand-description">Powerful tools for next-gen video storytellers.</p>

        <div className="auth-editor-visual">
          <img
            src="/assets/clipcraft_editor_illustration.png"
            alt="ClipCraft video editor"
            className="auth-editor-image"
          />
        </div>

        <div className="brand-features">
          <div className="feature-item">
            <div className="feature-symbol">
              <span className="feature-icon lightning-icon">⚡</span>
            </div>
            <div>
              <h3>Focused Workflow</h3>
              <p>Preview and edit with clear controls.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-symbol">
              <span className="feature-icon ai-icon">✨</span>
            </div>
            <div>
              <h3>All in One</h3>
              <p>Video, audio, effects &amp; more.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-symbol">
              <span className="feature-icon cloud-icon">☁</span>
            </div>
            <div>
              <h3>Responsive Workspace</h3>
              <p>Work comfortably across screen sizes.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
