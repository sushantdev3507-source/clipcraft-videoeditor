"use client";

// =========================================================
// ClipCraft - Video Editing Workspace
// Original owner: Nutan Dhepe (vanilla JS modules/editor/*.js)
// Converted to React for the ClipCraft Next-gen frontend.
// Single, integrated editor: one video element, one timeline.
// =========================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditor } from "@/context/EditorContext";
import { ApiError, isProcessing, mediaApi } from "@/lib/api";

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

  // --- restore saved per-project state --------------------------------
  useEffect(() => {
    if (!storageKey) return;
    let saved: EditorSnapshot | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      saved = raw ? (JSON.parse(raw) as EditorSnapshot) : null;
    } catch {
      saved = null;
    }
    const next = saved ? { ...initialSnapshot, ...saved } : initialSnapshot;
    setState(next);
    setHistory([next]);
    setHistoryIndex(0);
  }, [storageKey]);

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
    setToolStatus("Ready to export.");
  }

  function panelTitle(tool: Tool, isExport: boolean) {
    if (isExport) return "Export";
    const found = tools.find((item) => item.id === tool);
    return found && tool !== "media" ? found.label : "Properties";
  }

  function renderProperties() {
    if (exporting) {
      return (
        <div className="editor-property-placeholder">
          <p>Export your edited video.</p>

          <div className="editor-property-group">
            <label htmlFor="export-format-select">Format</label>
            <select id="export-format-select" className="editor-property-input" defaultValue="mp4">
              <option value="mp4">MP4</option>
            </select>
          </div>

          <div className="editor-property-group">
            <label htmlFor="export-quality-select">Quality</label>
            <select
              id="export-quality-select"
              className="editor-property-input"
              defaultValue="1080p"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              setToolStatus(
                "Export requires the ClipCraft rendering service, which is not connected yet.",
              )
            }
          >
            Start Export
          </button>

          <button type="button" className="btn" onClick={() => setExporting(false)}>
            Close
          </button>

          <div className="editor-transform-status">{toolStatus}</div>
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
