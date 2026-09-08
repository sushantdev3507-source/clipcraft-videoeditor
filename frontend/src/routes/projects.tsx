import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/shell/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { ApiError, projectsApi, type Project } from "@/lib/api";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — ClipCraft" },
      {
        name: "description",
        content: "Browse, search and open every video project in your ClipCraft workspace.",
      },
      { property: "og:title", content: "Projects — ClipCraft" },
      {
        property: "og:description",
        content: "Browse, search and open every video project in your ClipCraft workspace.",
      },
    ],
  }),
  component: ProjectsRoute,
});

type Status = "active" | "draft" | "exported";

const filters: { label: string; value: Status | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Drafts", value: "draft" },
  { label: "Exported", value: "exported" },
];

export const projectsQueryKey = ["projects"] as const;

function projectStatus(project: Project): Status {
  const raw = (project.status ?? "").toLowerCase();
  if (raw === "draft" || raw === "exported") return raw;
  return "active";
}

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

function ProjectsRoute() {
  return (
    <RequireAuth>
      <ProjectsPage />
    </RequireAuth>
  );
}

function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [formError, setFormError] = useState("");

  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: ({ signal }) => projectsApi.list(signal).then((data) => data.projects ?? []),
  });

  const createProject = useMutation({
    mutationFn: (title: string) => projectsApi.create({ title }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      setCreateOpen(false);
      setNewTitle("");
      const id = data.project?.id;
      if (id) void navigate({ to: "/entry", search: { projectId: id } });
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : "Could not create the project.");
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
  });

  const projects = projectsQuery.data ?? [];

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter(
      (project) =>
        (filter === "all" || projectStatus(project) === filter) &&
        projectTitle(project).toLowerCase().includes(term),
    );
  }, [projects, filter, search]);

  function handleDelete(project: Project) {
    const confirmed = window.confirm(
      `Delete "${projectTitle(project)}"? This also deletes all of its media and cannot be undone.`,
    );
    if (!confirmed) return;
    deleteProject.mutate(project.id);
  }

  return (
    <AppShell>
      <section className="media-library-header">
        <div>
          <span className="section-eyebrow">WORKSPACE</span>
          <h1>Projects</h1>
          <p>Every video project in your ClipCraft workspace.</p>
        </div>

        <button
          type="button"
          className="primary-action-button"
          onClick={() => {
            setFormError("");
            setCreateOpen(true);
          }}
        >
          + Create New Project
        </button>
      </section>

      {createOpen ? (
        <div className="media-library-toolbar" role="group" aria-label="Create a new project">
          <input
            type="text"
            className="media-search"
            placeholder="Project title..."
            aria-label="Project title"
            autoFocus
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && newTitle.trim()) {
                setFormError("");
                createProject.mutate(newTitle.trim());
              }
            }}
          />
          <div className="media-filters">
            <button
              type="button"
              className="primary-action-button"
              disabled={createProject.isPending || !newTitle.trim()}
              onClick={() => {
                setFormError("");
                createProject.mutate(newTitle.trim());
              }}
            >
              {createProject.isPending ? "Creating…" : "Create project"}
            </button>
            <button
              type="button"
              className="media-filter"
              onClick={() => {
                setCreateOpen(false);
                setFormError("");
                setNewTitle("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {formError ? (
        <p className="upload-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="media-library-toolbar">
        <input
          type="search"
          className="media-search"
          placeholder="Search projects..."
          aria-label="Search projects"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="media-filters">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`media-filter${filter === item.value ? " active" : ""}`}
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {deleteProject.isError ? (
        <p className="upload-error" role="alert">
          {deleteProject.error instanceof ApiError
            ? deleteProject.error.message
            : "Could not delete that project."}
        </p>
      ) : null}

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
      ) : visible.length === 0 ? (
        <div className="media-empty-state">
          <div className="media-empty-icon">▣</div>
          <h3>{projects.length === 0 ? "No projects yet" : "No projects found"}</h3>
          <p>
            {projects.length === 0
              ? "Create your first project to start uploading media and editing."
              : "Try a different search or filter."}
          </p>
          <button
            type="button"
            className="secondary-editor-button"
            onClick={() => {
              setFormError("");
              setCreateOpen(true);
            }}
          >
            Create New Project
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {visible.map((project, index) => (
            <article className="project-card" key={project.id}>
              <button
                type="button"
                className="project-thumbnail project-open-button"
                onClick={() => navigate({ to: "/editor", search: { projectId: project.id } })}
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
                  aria-label={`Remove ${projectTitle(project)}`}
                  title="Remove project"
                  disabled={deleteProject.isPending}
                  onClick={() => handleDelete(project)}
                >
                  ⋮
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
