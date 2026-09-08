import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import AppShell from "@/components/shell/AppShell";
import RequireAuth from "@/components/auth/RequireAuth";
import { formatFileSize, useEditor } from "@/context/EditorContext";
import { ApiError, mediaApi, projectsApi } from "@/lib/api";

type EntrySearch = { projectId?: string };

export const Route = createFileRoute("/entry")({
  validateSearch: (search: Record<string, unknown>): EntrySearch =>
    typeof search["projectId"] === "string" && search["projectId"]
      ? { projectId: search["projectId"] }
      : {},
  head: () => ({
    meta: [
      { title: "Start a New Video — ClipCraft" },
      {
        name: "description",
        content: "Upload an MP4, WebM or MOV file and continue to the ClipCraft editor.",
      },
      { property: "og:title", content: "Start a New Video — ClipCraft" },
      {
        property: "og:description",
        content: "Upload an MP4, WebM or MOV file and continue to the ClipCraft editor.",
      },
    ],
  }),
  component: EntryRoute,
});

function EntryRoute() {
  return (
    <RequireAuth>
      <EntryPage />
    </RequireAuth>
  );
}

function EntryPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useSearch();
  const { video, setVideo, clearVideo } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  // The raw File, kept only until it's uploaded -- EditorContext's `video`
  // stores just a name/size/object-URL, not the File itself, and the actual
  // upload (below) needs the File.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Confirms the project id in the URL is a real backend project before the
  // user can continue into the editor / media upload flow.
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: ({ signal }) => projectsApi.get(projectId as string, signal),
    enabled: Boolean(projectId),
  });

  // Uploads the picked file to this project via the same media API Media
  // Library uses, so a video started here is a real, persisted media asset
  // (not just an in-memory preview that disappears on refresh) the moment
  // the user continues into the editor.
  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.upload(projectId as string, file),
  });

  function handleFile(file: File | undefined | null) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      return;
    }
    setSelectedFile(file);
    setVideo(file); // instant local preview while the upload (on Continue) runs
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  async function handleContinue() {
    if (!selectedFile || !projectId) return;
    setError("");
    try {
      const { asset } = await uploadMutation.mutateAsync(selectedFile);
      // Hand off to the editor by assetId -- EditorWorkspace already knows
      // how to load and poll a real backend asset (see its assetQuery), the
      // same path the Media Library's "open in editor" uses.
      void navigate({ to: "/editor", search: { projectId, assetId: asset.id } });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not upload that video. Please try again.",
      );
    }
  }

  if (!projectId) {
    return (
      <AppShell>
        <section className="entry-page">
          <div className="entry-container">
            <div className="media-empty-state">
              <div className="media-empty-icon">▣</div>
              <h3>Choose a project first</h3>
              <p>Media belongs to a project, so pick or create one before uploading your video.</p>
              <Link to="/projects" className="secondary-editor-button">
                Go to Projects
              </Link>
            </div>
          </div>
        </section>
      </AppShell>
    );
  }

  const projectTitle = projectQuery.data?.project?.title;

  return (
    <AppShell>
      <section className="entry-page">
        <div className="entry-container">
          <div className="entry-header">
            <span className="entry-eyebrow">NEW PROJECT</span>
            <h1>Start your next video</h1>
            <p>
              {projectQuery.isPending
                ? "Loading project…"
                : projectTitle
                  ? `Upload a video for “${projectTitle}” and start editing with ClipCraft.`
                  : "Upload a video and start editing with ClipCraft."}
            </p>
          </div>

          {projectQuery.isError ? (
            <div className="media-empty-state" role="alert">
              <div className="media-empty-icon">!</div>
              <h3>We couldn't open that project</h3>
              <p>
                {projectQuery.error instanceof ApiError
                  ? projectQuery.error.message
                  : "Something went wrong."}
              </p>
              <button
                type="button"
                className="secondary-editor-button"
                onClick={() => void projectQuery.refetch()}
              >
                Try again
              </button>
            </div>
          ) : null}

          <div
            className={dragging ? "upload-card is-dragging" : "upload-card"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="upload-icon">↑</div>
            <h2>Upload your video</h2>
            <p>Drag and drop your video here, or select a file from your computer.</p>

            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <button
              type="button"
              className="upload-select-button"
              onClick={() => inputRef.current?.click()}
            >
              Select Video
            </button>

            <span className="upload-hint">MP4, WebM, MOV and other supported video formats</span>
          </div>

          {video ? (
            <>
              <div className="video-preview-card">
                <div className="video-preview-header">
                  <div>
                    <span className="preview-eyebrow">VIDEO PREVIEW</span>
                    <h2>Your selected video</h2>
                  </div>
                </div>
                <div className="video-preview-wrapper">
                  <video className="video-preview" src={video.url} controls playsInline />
                </div>
              </div>

              <div className="selected-file-card">
                <div className="selected-file-icon">▶</div>
                <div className="selected-file-info">
                  <strong>{video.name}</strong>
                  <span>{formatFileSize(video.size)}</span>
                </div>
                <button
                  type="button"
                  className="remove-file-button"
                  aria-label="Remove selected video"
                  onClick={() => {
                    clearVideo();
                    setSelectedFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  ×
                </button>
              </div>
            </>
          ) : null}

          {error ? <p className="upload-error">{error}</p> : null}

          <button
            type="button"
            className="continue-editor-button"
            disabled={!video || uploadMutation.isPending}
            onClick={() => void handleContinue()}
          >
            {uploadMutation.isPending ? "Uploading…" : "Continue to Editor"}
          </button>

          <Link to="/media" search={{ projectId }} className="secondary-editor-button">
            Open this project's Media Library
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
