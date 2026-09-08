"use client";

// =========================================================
// ClipCraft - Video Editing Workspace
// Converted from the original vanilla JS editor modules to React)
// Converted to React for the ClipCraft Next-gen frontend.
// Single, integrated editor: one video element, one timeline.
// =========================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEditor } from "@/context/EditorContext";
import {
  ApiError,
  exportApi,
  isExportInFlight,
  isProcessing,
  mediaApi,
  projectsApi,
  type ExportFormat,
  type ExportQuality,
  type TimelineClip,
  type TimelineJson,
} from "@/lib/api";

type Tool = "media" | "trim" | "split" | "speed" | "volume" | "transform" | "crop" | "text";
type TextPosition = "center" | "top" | "bottom";
type CropRatio = "original" | "16:9" | "9:16" | "1:1" | "4:3";

type EditorSnapshot = {
  speed: number;
  volume: number;
  muted: boolean;
  trimStart: number | null;
  trimEnd: number | null;
  splitTime: number | null;
  rotation: number;
  flipX: 1 | -1;
  flipY: 1 | -1;
  crop: CropRatio;
  text: string;
  textPosition: TextPosition;
};

const initialSnapshot: EditorSnapshot = {
  speed: 1,
  volume: 1,
  muted: false,
  trimStart: null,
  trimEnd: null,
  splitTime: null,
  rotation: 0,
  flipX: 1,
  flipY: 1,
  crop: "original",
  text: "",
  textPosition: "center",
};

const tools: { id: Tool; label: string }[] = [
  { id: "media", label: "Media" },
  { id: "trim", label: "Trim" },
  { id: "split", label: "Split" },
  { id: "speed", label: "Speed" },
  { id: "volume", label: "Volume" },
  { id: "transform", label: "Transform" },
  { id: "crop", label: "Crop" },
  { id: "text", label: "Text" },
];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// --- EditorSnapshot <-> backend timeline_json -------------------------
// The backend (app/services/timelineCompiler.service.js) validates/
// normalizes this exact clip shape and resolves it to a real render. This
// editor only ever produces a single track with a single clip -- `splitTime`
// has no equivalent on the backend and isn't saved (it's a pure UI marker
// with zero effect on rendering, same as in EditorSnapshot's own comments).

function snapshotToClip(snapshot: EditorSnapshot, assetId: string): TimelineClip {
  return {
    assetId,
    trimStart: snapshot.trimStart,
    trimEnd: snapshot.trimEnd,
    speed: snapshot.speed,
    volume: snapshot.volume,
    muted: snapshot.muted,
    rotation: snapshot.rotation,
    flipX: snapshot.flipX,
    flipY: snapshot.flipY,
    crop: snapshot.crop,
    text: snapshot.text,
    textPosition: snapshot.textPosition,
  };
}

function clipToSnapshotPatch(clip: TimelineClip): Partial<EditorSnapshot> {
  return {
    trimStart: clip.trimStart,
    trimEnd: clip.trimEnd,
    speed: clip.speed,
    volume: clip.volume,
    muted: clip.muted,
    rotation: clip.rotation,
    flipX: clip.flipX,
    flipY: clip.flipY,
    crop: clip.crop,
    text: clip.text,
    textPosition: clip.textPosition,
  };
}

/** Finds this asset's clip inside a project's saved timeline_json, if any. */
function extractClipForAsset(
  timeline: TimelineJson | undefined,
  assetId: string | null,
): TimelineClip | null {
  if (!timeline || !assetId) return null;
  for (const track of timeline.tracks ?? []) {
    for (const clip of track.clips ?? []) {
      if (clip.assetId === assetId) return clip;
    }
  }
  return null;
}

export default function EditorWorkspace({
  projectId = null,
  assetId = null,
}: {
  projectId?: string | null;
  assetId?: string | null;
} = {}) {
  const { video, setVideo, setRemoteVideo, clearVideo } = useEditor();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTool, setActiveTool] = useState<Tool>("media");
  const [state, setState] = useState<EditorSnapshot>(initialSnapshot);
  const [history, setHistory] = useState<EditorSnapshot[]>([initialSnapshot]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("No video loaded");
  const [toolStatus, setToolStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("mp4");
  const [exportQuality, setExportQuality] = useState<ExportQuality>("1080p");
  const [exportJobId, setExportJobId] = useState<string | null>(null);

  // The project's current optimistic-concurrency revision (see
  // PUT /api/v1/projects/:id/timeline) -- not React state, since updating it
  // must never itself trigger a re-render/re-save loop. null until the
  // project's real data has loaded.
  const revisionRef = useRef<number | null>(null);
  // Guards the debounced autosave effect below from firing on the
  // synchronous state set that happens while *loading* saved state (from
  // the backend or localStorage) -- only real user edits should autosave.
  const initializedRef = useRef(false);

  // --- already-uploaded backend asset ---------------------------------
  // When the editor is opened for an uploaded asset, its details come from the
  // media API and playback comes from /api/v1/media/:id/stream. Local
  // file-picker editing below is untouched.
  const assetQuery = useQuery({
    queryKey: ["media-asset", assetId],
    queryFn: ({ signal }) => mediaApi.get(assetId as string, signal).then((data) => data.asset),
    enabled: Boolean(assetId),
    refetchInterval: (query) => {
      const current = query.state.data;
      return current && isProcessing(current) ? 3000 : false;
    },
  });

  const asset = assetQuery.data;
  const assetReady = asset?.status === "READY";

  // The project's real, persisted timeline -- same query shape/key entry.tsx
  // uses, so navigating from there doesn't refetch what's already cached.
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: ({ signal }) => projectsApi.get(projectId as string, signal),
    enabled: Boolean(projectId),
  });
  const project = projectQuery.data?.project;

  const saveTimelineMutation = useMutation({
    mutationFn: (vars: { timeline_json: TimelineJson; revision: number }) =>
      projectsApi.saveTimeline(projectId as string, vars),
  });

  const createExportMutation = useMutation({
    mutationFn: (vars: { format: ExportFormat; quality: ExportQuality }) =>
      exportApi.create({
        projectId: projectId as string,
        format: vars.format,
        quality: vars.quality,
      }),
  });

  const exportJobQuery = useQuery({
    queryKey: ["export-job", exportJobId],
    queryFn: ({ signal }) => exportApi.get(exportJobId as string, signal).then((data) => data.job),
    enabled: Boolean(exportJobId),
    refetchInterval: (query) => {
      const job = query.state.data;
      return job && isExportInFlight(job) ? 1500 : false;
    },
  });
  const exportJob = exportJobQuery.data;

  const streamQuery = useQuery({
    queryKey: ["media-stream", assetId],
    queryFn: ({ signal }) => mediaApi.objectUrl(mediaApi.streamPath(assetId as string), signal),
    enabled: Boolean(assetId) && assetReady,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!assetId || !asset || !streamQuery.data) return;
    if (video?.assetId === assetId) return;
    setRemoteVideo({
      name: asset.originalFilename,
      size: asset.fileSizeBytes ?? 0,
      url: streamQuery.data,
      assetId,
    });
    setCurrentTime(0);
    setDuration(0);
    setStatus("Video loaded");
  }, [assetId, asset, streamQuery.data, video?.assetId, setRemoteVideo]);

  useEffect(() => {
    if (!assetId) return;
    if (assetQuery.isError) {
      setStatus(
        assetQuery.error instanceof ApiError
          ? assetQuery.error.message
          : "This media item could not be loaded",
      );
    } else if (streamQuery.isError) {
      setStatus("Playback from the ClipCraft server failed");
    } else if (asset?.status === "FAILED") {
      setStatus("This media item failed to process on the server");
    } else if (asset && isProcessing(asset)) {
      setStatus("Still processing on the server…");
    } else if (assetQuery.isPending || streamQuery.isPending) {
      setStatus("Loading media from your project…");
    }
  }, [
    assetId,
    asset,
    assetQuery.isError,
    assetQuery.error,
    assetQuery.isPending,
    streamQuery.isError,
    streamQuery.isPending,
  ]);

  const storageKey = video ? `clipcraft_editor_state_${video.assetId ?? video.name}` : null;

  // --- history -------------------------------------------------------
  // History is kept in a ref-free, pure-reducer style: no side effects inside
  // a setState updater (that caused duplicated/stale history entries, which
  // made undo/redo restore the wrong text position).
  const persist = useCallback(
    (snapshot: EditorSnapshot) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {
        /* storage unavailable */
      }
    },
    [storageKey],
  );

  const commit = useCallback(
    (patch: Partial<EditorSnapshot>) => {
      const next = { ...state, ...patch };
      setState(next);
      setHistory((h) => [...h.slice(0, historyIndex + 1), next]);
      setHistoryIndex(historyIndex + 1);
      persist(next);
    },
    [state, historyIndex, persist],
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  function undo() {
    if (!canUndo) return;
    const index = historyIndex - 1;
    const snapshot = history[index];
    if (!snapshot) return;
    setHistoryIndex(index);
    setState(snapshot);
    persist(snapshot);
  }

  function redo() {
    if (!canRedo) return;
    const index = historyIndex + 1;
    const snapshot = history[index];
    if (!snapshot) return;
    setHistoryIndex(index);
    setState(snapshot);
    persist(snapshot);
  }

  // --- restore saved state: the project's real timeline_json first, this
  // browser's local draft as a fallback ---------------------------------
  // A real backend edit (once this project/asset has one) always wins over
  // localStorage -- localStorage only matters before the first save ever
  // reaches the backend, or when there's no projectId at all (the local
  // file-picker flow, which has no project to save to).
  useEffect(() => {
    if (!storageKey) return;
    // Reset while we wait for the definitive answer, so the debounced
    // autosave effect below can't fire against a stale/wrong revision
    // while a project switch or initial load is still in flight.
    initializedRef.current = false;
    revisionRef.current = null;

    if (projectId && projectQuery.isPending) return;

    let patch: Partial<EditorSnapshot> = {};
    if (project) {
      revisionRef.current = project.revision ?? null;
      const clip = extractClipForAsset(project.timeline_json, assetId);
      if (clip) {
        patch = clipToSnapshotPatch(clip);
      }
    }

    if (Object.keys(patch).length === 0) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) patch = JSON.parse(raw) as Partial<EditorSnapshot>;
      } catch {
        /* storage unavailable / corrupt -- fall through to defaults */
      }
    }

    const next = { ...initialSnapshot, ...patch };
    setState(next);
    setHistory([next]);
    setHistoryIndex(0);
    initializedRef.current = true;
    // project/assetId identify which saved edit we're loading; project.data
    // itself (not just isPending) must also be watched so this reruns once
    // the query resolves.
  }, [storageKey, projectId, assetId, project, projectQuery.isPending]);

  // --- debounced autosave of the timeline to the backend ---------------
  useEffect(() => {
    if (!projectId || !asset?.id) return;
    if (!initializedRef.current || revisionRef.current === null) return;

    const timer = setTimeout(() => {
      const revision = revisionRef.current;
      if (revision === null) return;
      const timeline_json: TimelineJson = {
        tracks: [{ clips: [snapshotToClip(state, asset.id)] }],
      };

      setSaveStatus("Saving…");
      saveTimelineMutation.mutate(
        { timeline_json, revision },
        {
          onSuccess: (data) => {
            revisionRef.current = data.project.revision ?? revision + 1;
            setSaveStatus("Saved");
          },
          onError: (err) => {
            if (err instanceof ApiError && err.status === 409) {
              setSaveStatus("This project changed elsewhere — reopen it to sync.");
              return;
            }
            setSaveStatus(err instanceof ApiError ? err.message : "Couldn't save your edit.");
          },
        },
      );
    }, 800);

    return () => clearTimeout(timer);
    // saveTimelineMutation is intentionally omitted: it's a new object
    // identity every render (react-query's useMutation), so depending on it
    // would reset this debounce timer on every render instead of only on a
    // real edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, projectId, asset?.id]);

  // --- apply state to the single video element ------------------------
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = state.speed;
    el.volume = state.volume;
    el.muted = state.muted;
  }, [state.speed, state.volume, state.muted, video?.url]);

  // --- playback -------------------------------------------------------
  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      if (state.trimStart !== null && el.currentTime < state.trimStart) {
        el.currentTime = state.trimStart;
      }
      el.play().catch(() => {
        setStatus("This video format can't be played in your browser");
      });
    } else {
      el.pause();
    }
  }

  function onTimeUpdate() {
    const el = videoRef.current;
    if (!el) return;
    if (state.trimEnd !== null && el.currentTime >= state.trimEnd) {
      el.pause();
      el.currentTime = state.trimStart ?? 0;
    }
    setCurrentTime(el.currentTime);
  }

  function onLoadedMetadata() {
    const el = videoRef.current;
    if (!el) return;
    setDuration(el.duration || 0);
    setStatus("Video loaded");
  }

  function seekFromTimeline(event: React.MouseEvent<HTMLDivElement>) {
    const el = videoRef.current;
    if (!el || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    el.currentTime = ratio * duration;
    setCurrentTime(el.currentTime);
  }

  // --- upload ---------------------------------------------------------
  function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setStatus("Unsupported file type");
      return;
    }
    setVideo(file);
    setStatus("Video loaded");
    setCurrentTime(0);
    setDuration(0);
  }

  const transformStyle = useMemo(
    () => ({
      transform: `rotate(${state.rotation}deg) scale(${state.flipX}, ${state.flipY})`,
    }),
    [state.rotation, state.flipX, state.flipY],
  );

  const cropClass = state.crop === "original" ? "" : ` crop-${state.crop.replace(":", "-")}`;

  const trimStart = state.trimStart ?? 0;
  const trimEnd = state.trimEnd ?? duration;
  const clipLeft = duration ? (trimStart / duration) * 100 : 0;
  const clipWidth = duration ? Math.max(((trimEnd - trimStart) / duration) * 100, 2) : 100;
  const playheadLeft = duration ? (currentTime / duration) * 100 : 0;

  return (
    <section className="editor-workspace" data-project-id={projectId ?? undefined}>
      {/* ---------------- Toolbar ---------------- */}
      <header className="editor-toolbar">
        <div className="editor-project-info">
          <div>
            <h1 className="editor-project-title">ClipCraft Editor</h1>
            <span className="editor-project-status">{video ? video.name : "Ready to edit"}</span>
          </div>
        </div>

        <div className="editor-toolbar-actions">
          {projectId && asset?.id && saveStatus ? (
            <span className="editor-project-status" aria-live="polite">
              {saveStatus}
            </span>
          ) : null}
          <button type="button" className="btn" onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button type="button" className="btn" onClick={redo} disabled={!canRedo}>
            Redo
          </button>
          <button type="button" className="btn btn-primary" onClick={openExport}>
            Export
          </button>
        </div>
      </header>

      <div className="editor-main">
        {/* ---------------- Tools ---------------- */}
        <aside className="editor-tools">
          <h2 className="editor-panel-title">Tools</h2>

          <div className="editor-tool-list">
            <button
              type="button"
              className={
                activeTool === "media" ? "editor-tool-button active" : "editor-tool-button"
              }
              onClick={() => {
                setActiveTool("media");
                setToolStatus("");
              }}
            >
              Media
            </button>

            <div className="editor-media-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Video
              </button>
            </div>

            {tools
              .filter((tool) => tool.id !== "media")
              .map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className={
                    activeTool === tool.id ? "editor-tool-button active" : "editor-tool-button"
                  }
                  onClick={() => {
                    setActiveTool(tool.id);
                    setToolStatus("");
                  }}
                >
                  {tool.label}
                </button>
              ))}
          </div>
        </aside>

        {/* ---------------- Preview ---------------- */}
        <section className="editor-preview">
          <div className="editor-preview-header">
            <span className="editor-preview-title">Preview</span>
            <span className="editor-project-status">{status}</span>
          </div>

          <div className={`editor-preview-content${cropClass}`}>
            {video ? (
              <div className="editor-video-stage">
                <video
                  ref={videoRef}
                  id="editor-video"
                  className="editor-video"
                  src={video.url}
                  style={transformStyle}
                  playsInline
                  onLoadedMetadata={onLoadedMetadata}
                  onTimeUpdate={onTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setStatus("Video could not be loaded")}
                />
                <div
                  className={`editor-text-overlay text-position-${state.textPosition}`}
                  aria-hidden={state.text ? "false" : "true"}
                >
                  {state.text}
                </div>
              </div>
            ) : (
              <div className="editor-empty-preview">
                <h3>No video selected</h3>
                <p>Upload a video to begin editing.</p>
              </div>
            )}
          </div>
        </section>

        {/* ---------------- Properties ---------------- */}
        <aside className="editor-properties">
          <h2 className="editor-panel-title">{panelTitle(activeTool, exporting)}</h2>
          {renderProperties()}
        </aside>
      </div>

      {/* ---------------- Playback ---------------- */}
      <section className="editor-playback">
        <button
          type="button"
          className="editor-playback-button"
          aria-label={isPlaying ? "Pause video" : "Play video"}
          onClick={togglePlay}
          disabled={!video}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <div className="editor-time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <button
          type="button"
          className="editor-playback-button"
          aria-label={state.muted ? "Unmute video" : "Mute video"}
          onClick={() => commit({ muted: !state.muted })}
          disabled={!video}
        >
          {state.muted ? "🔇" : "🔊"}
        </button>
      </section>

      {/* ---------------- Timeline ---------------- */}
      <section className="editor-timeline">
        <div className="timeline-header">
          <h2 className="timeline-title">Timeline</h2>
          <span className="editor-project-status">
            {video ? `${formatTime(duration)} clip` : "No media"}
          </span>
        </div>

        <div className="timeline-ruler">
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <span key={fraction}>{formatTime(duration * fraction)}</span>
          ))}
        </div>

        <div className="timeline-track" onClick={seekFromTimeline} role="presentation">
          {video ? (
            <>
              <div
                className="timeline-clip timeline-segment"
                style={{ marginLeft: `${clipLeft}%`, width: `${clipWidth}%` }}
              >
                {video.name}
              </div>
              {state.splitTime !== null && duration ? (
                <div
                  className="timeline-split-marker"
                  style={{ left: `${(state.splitTime / duration) * 100}%` }}
                  aria-hidden="true"
                />
              ) : null}
              <div
                className="timeline-playhead"
                style={{ left: `${playheadLeft}%` }}
                aria-hidden="true"
              />
            </>
          ) : (
            <div className="timeline-clip timeline-empty">No video loaded</div>
          )}
        </div>
      </section>
    </section>
  );

  // -------------------------------------------------------------------
  function openExport() {
    setExporting(true);
    setExportJobId(null);
    setToolStatus(
      projectId && asset?.id ? "Ready to export." : "Export requires an uploaded project video.",
    );
  }

  /**
   * Saves the current edit (bypassing the autosave debounce, so the export
   * always renders exactly what's on screen) and then creates a real export
   * job. On a revision conflict (someone/something else saved in between),
   * refetches the project and asks the user to retry rather than silently
   * clobbering whatever changed.
   */
  async function startExport() {
    if (!projectId || !asset?.id) {
      setToolStatus("Export requires a project and an uploaded video.");
      return;
    }
    if (revisionRef.current === null) {
      setToolStatus("Still loading this project's saved edit — try again in a moment.");
      return;
    }

    try {
      setToolStatus("Saving your edit…");
      const timeline_json: TimelineJson = {
        tracks: [{ clips: [snapshotToClip(state, asset.id)] }],
      };
      const saveResult = await saveTimelineMutation.mutateAsync({
        timeline_json,
        revision: revisionRef.current,
      });
      revisionRef.current = saveResult.project.revision ?? revisionRef.current + 1;
      setSaveStatus("Saved");

      setToolStatus("Starting export…");
      const { job } = await createExportMutation.mutateAsync({
        format: exportFormat,
        quality: exportQuality,
      });
      setExportJobId(job.id);
      setToolStatus("Export queued…");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const fresh = await projectQuery.refetch();
        const freshProject = fresh.data?.project;
        if (freshProject) revisionRef.current = freshProject.revision ?? revisionRef.current;
        setToolStatus("This project changed elsewhere — please try Start Export again.");
        return;
      }
      setToolStatus(
        err instanceof ApiError ? err.message : "Could not start the export. Please try again.",
      );
    }
  }

  /** Downloads a completed export's rendered file via a real browser save. */
  async function downloadCompletedExport() {
    if (!exportJobId) return;
    try {
      setToolStatus("Preparing download…");
      const url = await exportApi.downloadUrl(exportJobId);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clipcraft-export-${exportJobId}.${exportJob?.format ?? "mp4"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setToolStatus("Download started.");
    } catch (err) {
      setToolStatus(
        err instanceof ApiError ? err.message : "Could not download the exported video.",
      );
    }
  }

  function panelTitle(tool: Tool, isExport: boolean) {
    if (isExport) return "Export";
    const found = tools.find((item) => item.id === tool);
    return found && tool !== "media" ? found.label : "Properties";
  }

  function renderProperties() {
    if (exporting) {
      const inFlight =
        saveTimelineMutation.isPending ||
        createExportMutation.isPending ||
        (exportJob ? isExportInFlight(exportJob) : false);
      const canExport = Boolean(projectId && asset?.id);

      return (
        <div className="editor-property-placeholder">
          <p>Export your edited video.</p>

          <div className="editor-property-group">
            <label htmlFor="export-format-select">Format</label>
            <select
              id="export-format-select"
              className="editor-property-input"
              value={exportFormat}
              disabled={inFlight}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            >
              <option value="mp4">MP4</option>
            </select>
          </div>

          <div className="editor-property-group">
            <label htmlFor="export-quality-select">Quality</label>
            <select
              id="export-quality-select"
              className="editor-property-input"
              value={exportQuality}
              disabled={inFlight}
              onChange={(e) => setExportQuality(e.target.value as ExportQuality)}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>

          {exportJob?.status === "completed" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void downloadCompletedExport()}
            >
              Download Video
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void startExport()}
              disabled={inFlight || !canExport}
            >
              {inFlight ? "Exporting…" : "Start Export"}
            </button>
          )}

          {exportJob?.status === "failed" ? (
            <button type="button" className="btn" onClick={() => void startExport()}>
              Retry Export
            </button>
          ) : null}

          <button
            type="button"
            className="btn"
            onClick={() => {
              setExporting(false);
              setExportJobId(null);
            }}
          >
            Close
          </button>

          <div className="editor-transform-status">
            {exportJob?.status === "failed"
              ? exportJob.error_message || "The export failed."
              : exportJob?.status === "completed"
                ? "Your video is ready to download."
                : toolStatus}
          </div>
        </div>
      );
    }

    if (!video && activeTool !== "media") {
      return (
        <div className="editor-property-placeholder">
          Upload a video to use the {activeTool} tools.
        </div>
      );
    }

    switch (activeTool) {
      case "trim":
        return (
          <div className="editor-trim-properties">
            <div className="editor-property-group">
              <label htmlFor="trim-start">Start (seconds)</label>
              <input
                id="trim-start"
                className="editor-property-input"
                type="number"
                min={0}
                max={duration}
                step={0.1}
                value={state.trimStart ?? 0}
                onChange={(e) => commit({ trimStart: Number(e.target.value) })}
              />
            </div>

            <div className="editor-property-group">
              <label htmlFor="trim-end">End (seconds)</label>
              <input
                id="trim-end"
                className="editor-property-input"
                type="number"
                min={0}
                max={duration}
                step={0.1}
                value={state.trimEnd ?? Number(duration.toFixed(1))}
                onChange={(e) => commit({ trimEnd: Number(e.target.value) })}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const start = state.trimStart ?? 0;
                const end = state.trimEnd ?? duration;
                if (end <= start) {
                  setToolStatus("End time must be greater than start time.");
                  return;
                }
                if (videoRef.current) videoRef.current.currentTime = start;
                setToolStatus(`Trim preview: ${formatTime(start)} – ${formatTime(end)}`);
              }}
            >
              Preview Trim
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => {
                commit({ trimStart: null, trimEnd: null });
                setToolStatus("Trim reset to full clip.");
              }}
            >
              Reset Trim
            </button>

            <div className="editor-transform-status">
              {toolStatus || `Full clip: ${formatTime(duration)}`}
            </div>
          </div>
        );

      case "split":
        return (
          <div className="editor-property-placeholder">
            <p>Split the clip at the current playback position.</p>
            <div className="editor-transform-status">
              Split point: {formatTime(state.splitTime ?? currentTime)}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                commit({ splitTime: currentTime });
                setToolStatus(`Clip split at ${formatTime(currentTime)}.`);
              }}
            >
              Split Here
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => {
                commit({ splitTime: null });
                setToolStatus("Split removed.");
              }}
            >
              Reset Split
            </button>

            <div className="editor-transform-status">{toolStatus}</div>
          </div>
        );

      case "speed":
        return (
          <div className="editor-property-placeholder">
            <p>Change the playback speed of the video.</p>

            <div className="editor-property-group">
              <label htmlFor="speed-select">Speed</label>
              <select
                id="speed-select"
                className="editor-property-input editor-speed-select"
                value={String(state.speed)}
                onChange={(e) => {
                  commit({ speed: Number(e.target.value) });
                  setToolStatus(`Speed set to ${e.target.value}x`);
                }}
              >
                {[0.25, 0.5, 1, 1.5, 2].map((speed) => (
                  <option key={speed} value={speed}>
                    {speed}x
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => {
                commit({ speed: 1 });
                setToolStatus("Speed reset to 1x");
              }}
            >
              Reset Speed
            </button>

            <div className="editor-transform-status">
              {toolStatus || `Current speed: ${state.speed}x`}
            </div>
          </div>
        );

      case "volume":
        return (
          <div className="editor-property-placeholder">
            <p>Adjust the audio volume of the video.</p>

            <div className="editor-property-group">
              <label htmlFor="video-volume-range">Volume</label>
              <input
                id="video-volume-range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(state.volume * 100)}
                onChange={(e) => commit({ volume: Number(e.target.value) / 100 })}
              />
            </div>

            <div className="editor-volume-status">
              Volume: {Math.round(state.volume * 100)}%{state.muted ? " (muted)" : ""}
            </div>

            <button type="button" className="btn" onClick={() => commit({ muted: !state.muted })}>
              {state.muted ? "Unmute" : "Mute"}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => commit({ volume: 1, muted: false })}
            >
              Reset Volume
            </button>
          </div>
        );

      case "transform": {
        const flipText =
          state.flipX === -1 && state.flipY === -1
            ? "Horizontal + Vertical"
            : state.flipX === -1
              ? "Horizontal"
              : state.flipY === -1
                ? "Vertical"
                : "None";

        return (
          <div className="editor-property-placeholder">
            <p>Rotate or flip the video preview.</p>

            <div className="editor-property-group">
              <button
                type="button"
                className="btn"
                onClick={() => commit({ rotation: (state.rotation - 90 + 360) % 360 })}
              >
                Rotate Left
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => commit({ rotation: (state.rotation + 90) % 360 })}
              >
                Rotate Right
              </button>
            </div>

            <div className="editor-property-group">
              <button
                type="button"
                className="btn"
                onClick={() => commit({ flipX: state.flipX === 1 ? -1 : 1 })}
              >
                Flip Horizontal
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => commit({ flipY: state.flipY === 1 ? -1 : 1 })}
              >
                Flip Vertical
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => commit({ rotation: 0, flipX: 1, flipY: 1 })}
            >
              Reset Transform
            </button>

            <div className="editor-transform-status">
              Rotation: {state.rotation}° | Flip: {flipText}
            </div>
          </div>
        );
      }

      case "crop":
        return (
          <div className="editor-crop-properties">
            <div className="editor-property-group">
              <label htmlFor="crop-aspect-ratio">Aspect Ratio</label>
              <select
                id="crop-aspect-ratio"
                className="editor-property-input"
                value={state.crop}
                onChange={(e) => commit({ crop: e.target.value as CropRatio })}
              >
                <option value="original">Original</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="4:3">4:3</option>
              </select>
            </div>

            <p className="editor-property-description">Choose an aspect ratio for your video.</p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setToolStatus(
                  state.crop === "original"
                    ? "Original aspect ratio selected"
                    : `Crop ratio: ${state.crop}`,
                )
              }
            >
              Apply Crop
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => {
                commit({ crop: "original" });
                setToolStatus("Original aspect ratio selected");
              }}
            >
              Reset Crop
            </button>

            <div className="editor-transform-status">
              {toolStatus ||
                (state.crop === "original"
                  ? "Original aspect ratio selected"
                  : `Crop ratio: ${state.crop}`)}
            </div>
          </div>
        );

      case "text":
        return <TextPanel state={state} commit={commit} />;

      case "media":
      default:
        return (
          <div className="editor-property-placeholder">
            {video ? (
              <>
                <p>
                  <strong>{video.name}</strong>
                </p>
                <p>Duration: {formatTime(duration)}</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    clearVideo();
                    setStatus("No video loaded");
                    setCurrentTime(0);
                    setDuration(0);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove Video
                </button>
              </>
            ) : (
              "Select a tool or upload a video to view editing properties."
            )}
          </div>
        );
    }
  }
}

function TextPanel({
  state,
  commit,
}: {
  state: EditorSnapshot;
  commit: (patch: Partial<EditorSnapshot>) => void;
}) {
  const [draft, setDraft] = useState(state.text);
  const [message, setMessage] = useState("Enter text and click Add Text");

  useEffect(() => {
    setDraft(state.text);
  }, [state.text]);

  return (
    <div className="editor-text-properties">
      <div className="editor-property-group">
        <label htmlFor="text-overlay-input">Text</label>
        <input
          id="text-overlay-input"
          className="editor-property-input"
          type="text"
          maxLength={200}
          placeholder="Enter text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          const value = draft.trim();
          if (!value) {
            setMessage("Please enter some text first.");
            return;
          }
          commit({ text: value });
          setMessage(`Text added: "${value}"`);
        }}
      >
        Add Text
      </button>

      <div className="editor-property-group">
        <label htmlFor="text-position-select">Position</label>
        <select
          id="text-position-select"
          className="editor-property-input"
          value={state.textPosition}
          onChange={(e) => commit({ textPosition: e.target.value as TextPosition })}
        >
          <option value="center">Center</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </select>
      </div>

      <button
        type="button"
        className="btn"
        onClick={() => {
          setDraft("");
          commit({ text: "" });
          setMessage("Enter text and click Add Text");
        }}
      >
        Clear Text
      </button>

      <div className="editor-transform-status">{message}</div>
    </div>
  );
}
