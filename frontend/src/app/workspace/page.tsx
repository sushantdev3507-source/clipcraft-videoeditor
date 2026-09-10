"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/shell/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import { ApiError, projectsApi, type Project } from "@/lib/api";

function DashboardRoute() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}

// Same cache key as the Projects page, so a project created here shows up there.
const projectsQueryKey = ["projects"] as const;

function projectTitle(project: Project) {
  return project.title?.trim() || "Untitled project";
}

function projectMeta(project: Project) {
  const stamp = project.updated_at ?? project.updatedAt ?? project.created_at ?? project.createdAt;
  if (!stamp) return "No edit date available";
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return "No edit date available";
  return `Edited ${date.toLocaleDateString()}`;
}

function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [nameError, setNameError] = useState("");

  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: ({ signal }) => projectsApi.list(signal).then((data) => data.projects ?? []),
  });

  const projects = projectsQuery.data ?? [];
  const recentProjects = projects.slice(0, 3);

  const createMutation = useMutation({
    mutationFn: (title: string) => projectsApi.create({ title }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      setModalOpen(false);
      setProjectName("");
      const id = data.project?.id;
      if (id) router.push(`/entry?projectId=${encodeURIComponent(id)}`);
    },
    onError: (error) => {
      setNameError(error instanceof ApiError ? error.message : "Could not create the project.");
    },
  });

  function createProject() {
    if (!projectName.trim()) {
      setNameError("Please enter a project name.");
      return;
    }
    setNameError("");
    createMutation.mutate(projectName.trim());
  }

  return (
    <AppShell>
      <section className="dashboard-hero">
        <div className="dashboard-hero-text">
          <span className="dashboard-eyebrow">CLIPCRAFT WORKSPACE</span>
          <h1>Welcome back, {user?.name ?? "creator"} 👋</h1>
          <p>Let's create something amazing today.</p>
        </div>

        <button
          type="button"
          className="button button-primary"
          id="createProjectButton"
          onClick={() => setModalOpen(true)}
        >
          + Create New Project
        </button>
      </section>

      <section className="dashboard-stats">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Total Projects</span>
            <span className="stat-icon">▣</span>
          </div>
          <strong className="stat-value">
            {projectsQuery.isPending ? "…" : projectsQuery.isError ? "—" : projects.length}
          </strong>
          <span className="stat-meta">
            {projectsQuery.isError ? "Couldn't load projects" : "Projects created"}
          </span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Media Files</span>
            <span className="stat-icon">▤</span>
          </div>
          {/* Media is counted per project by the backend; there is no
              workspace-wide media count endpoint, so no number is shown. */}
          <strong className="stat-value">—</strong>
          <span className="stat-meta">Open a project to see its files</span>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">WORKSPACE</span>
            <h2>Recent Projects</h2>
          </div>
          <div className="section-heading-actions">
            <span className="badge badge-primary">ACTIVE</span>
            <button
              type="button"
              className="text-button"
              onClick={() => router.push("/projects")}
            >
              View All
            </button>
          </div>
        </div>

        {projectsQuery.isPending ? (
          <div className="media-empty-state" role="status" aria-live="polite">
            <div className="media-empty-icon">▣</div>
            <h3>Loading your projects…</h3>
            <p>Fetching your ClipCraft workspace.</p>
          </div>
        ) : projectsQuery.isError ? (
          <div className="media-empty-state" role="alert">
            <div className="media-empty-icon">!</div>
            <h3>We couldn't load your projects</h3>
            <p>
              {projectsQuery.error instanceof ApiError
                ? projectsQuery.error.message
                : "Something went wrong."}
            </p>
            <button
              type="button"
              className="secondary-editor-button"
              onClick={() => void projectsQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="media-empty-state">
            <div className="media-empty-icon">▣</div>
            <h3>No projects yet</h3>
            <p>Create your first project to start uploading media and editing.</p>
            <button
              type="button"
              className="secondary-editor-button"
              onClick={() => setModalOpen(true)}
            >
              Create New Project
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {recentProjects.map((project, index) => (
              <article className="project-card" key={project.id}>
                <button
                  type="button"
                  className="project-thumbnail project-open-button"
                  onClick={() => router.push(`/editor?projectId=${encodeURIComponent(project.id)}`)}
                  aria-label={`Open ${projectTitle(project)} in the editor`}
                >
                  <span>{`Project ${String(index + 1).padStart(2, "0")}`}</span>
                </button>
                <div className="project-card-content">
                  <div>
                    <h3>{projectTitle(project)}</h3>
                    <p>{projectMeta(project)}</p>
                  </div>
                  <button
                    type="button"
                    className="icon-button project-menu-button"
                    aria-label={`Manage ${projectTitle(project)}`}
                    title="Manage in Projects"
                    onClick={() => router.push("/projects")}
                  >
                    ⋮
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">QUICK ACCESS</span>
            <h2>Quick Actions</h2>
          </div>
        </div>

        <div className="quick-action-grid">
          <button type="button" className="quick-action-card" onClick={() => setModalOpen(true)}>
            <span className="quick-action-icon">+</span>
            <span className="quick-action-content">
              <strong>New Project</strong>
              <small>Start editing a video</small>
            </span>
          </button>

          <button
            type="button"
            className="quick-action-card"
            onClick={() => router.push("/templates")}
          >
            <span className="quick-action-icon">◇</span>
            <span className="quick-action-content">
              <strong>Templates</strong>
              <small>Browse ready designs</small>
            </span>
          </button>

          <button
            type="button"
            className="quick-action-card"
            onClick={() => router.push("/entry")}
          >
            <span className="quick-action-icon">↑</span>
            <span className="quick-action-content">
              <strong>Import Media</strong>
              <small>Add videos and images</small>
            </span>
          </button>
        </div>
      </section>

      {modalOpen ? (
        <div className="modal-overlay is-open" id="projectModal">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="projectModalTitle"
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">NEW PROJECT</span>
                <h2 id="projectModalTitle">Create New Project</h2>
                <p>Start a new video editing project.</p>
              </div>
              <button
                type="button"
                className="modal-close-button"
                aria-label="Close modal"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <label htmlFor="modalProjectName" className="modal-label">
                Project Name
              </label>
              <input
                type="text"
                id="modalProjectName"
                className="modal-input"
                placeholder="Enter project name..."
                autoComplete="off"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createProject();
                }}
              />
              {nameError ? <p className="modal-error">{nameError}</p> : null}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={createProject}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating…" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}


export default DashboardRoute;
