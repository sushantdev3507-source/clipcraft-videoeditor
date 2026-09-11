"use client";

// ClipCraft Media Library — backed by the real media API:
//   GET    /api/v1/projects/:projectId/media
//   POST   /api/v1/media/upload          (multipart: projectId then file)
//   GET    /api/v1/media/:id             (status polling)
//   GET    /api/v1/media/:id/thumbnail
//   DELETE /api/v1/media/:id

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, MEDIA_SIZE_LIMITS, isProcessing, mediaApi, type MediaAsset } from "@/lib/api";

type FilterType = "all" | "video" | "image" | "audio";

function formatFileSize(bytes: number) {
  if (!bytes) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, index)).toFixed(1)) + " " + units[index];
}

function assetKind(asset: MediaAsset): FilterType {
  const type = `${asset.mediaType ?? ""} ${asset.mimeType ?? ""}`.toLowerCase();
  if (type.includes("video")) return "video";
  if (type.includes("image")) return "image";
  if (type.includes("audio")) return "audio";
  return "all";
}

function limitForFile(file: File) {
  if (file.type.startsWith("video/")) return MEDIA_SIZE_LIMITS.video;
  if (file.type.startsWith("audio/")) return MEDIA_SIZE_LIMITS.audio;
  if (file.type.startsWith("image/")) return MEDIA_SIZE_LIMITS.image;
  return null;
}

const filters: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Videos", value: "video" },
  { label: "Images", value: "image" },
  { label: "Audio", value: "audio" },
];

export default function MediaLibrary({ projectId }: { projectId: string | null }) {
  const queryClient = useQueryClient();
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all");
  const [searchText, setSearchText] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaKey = useMemo(() => ["media", projectId] as const, [projectId]);

  const assetsQuery = useQuery({
    queryKey: mediaKey,
    queryFn: ({ signal }) =>
      mediaApi.listForProject(projectId as string, signal).then((data) => data.assets ?? []),
    enabled: Boolean(projectId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.upload(projectId as string, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mediaApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaKey }),
  });

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!projectId) return;
    setUploadError("");

    for (const file of selectedFiles) {
      const limit = limitForFile(file);
      if (limit !== null && file.size > limit) {
        setUploadError(
          `"${file.name}" is ${formatFileSize(file.size)} — the limit for this type is ${formatFileSize(limit)}.`,
        );
        continue;
      }
      try {
        await uploadMutation.mutateAsync(file);
      } catch (error) {
        const status = error instanceof ApiError ? error.status : 0;
        const message =
          status === 413
            ? `"${file.name}" is larger than the server allows.`
            : status === 415
              ? `"${file.name}" isn't a supported file type.`
              : error instanceof ApiError
                ? error.message
                : `Could not upload "${file.name}".`;
        setUploadError(message);
      }
    }
  }

  function handleDelete(asset: MediaAsset) {
    const confirmed = window.confirm(
      `Delete "${asset.originalFilename}"? This permanently removes the file.`,
    );
    if (!confirmed) return;
    deleteMutation.mutate(asset.id);
  }

  const assets = assetsQuery.data ?? [];

  const filteredAssets = useMemo(() => {
    const search = searchText.toLowerCase().trim();
    return assets.filter((asset) => {
      const matchesSearch = (asset.originalFilename ?? "").toLowerCase().includes(search);
      const matchesFilter = currentFilter === "all" || assetKind(asset) === currentFilter;
      return matchesSearch && matchesFilter;
    });
  }, [assets, currentFilter, searchText]);

  if (!projectId) {
    return (
      <section className="media-library">
        <div className="media-library-header">
          <div>
            <span className="section-eyebrow">CLIPCRAFT WORKSPACE</span>
            <h1>Media Library</h1>
            <p>Manage your videos, images and audio files.</p>
          </div>
        </div>

        <div className="media-grid">
          <div className="media-empty-state">
            <div className="media-empty-icon">▣</div>
            <h3>Choose a project first</h3>
            <p>Media is stored per project, so open a project to see and upload its files.</p>
            <Link href="/projects" className="secondary-editor-button">
              Go to Projects
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="media-library">
      <div className="media-library-header">
        <div>
          <span className="section-eyebrow">CLIPCRAFT WORKSPACE</span>
          <h1>Media Library</h1>
          <p>Manage your videos, images and audio files.</p>
        </div>

        <button
          type="button"
          className="primary-action-button"
          onClick={openFilePicker}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading…" : "+ Upload Media"}
        </button>
      </div>

      <div className="media-library-toolbar">
        <input
          type="text"
          className="media-search"
          placeholder="Search media..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />

        <div className="media-filters">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`media-filter${currentFilter === filter.value ? " active" : ""}`}
              onClick={() => setCurrentFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {uploadError ? (
        <p className="upload-error" role="alert">
          {uploadError}
        </p>
      ) : null}

      {deleteMutation.isError ? (
        <p className="upload-error" role="alert">
          {deleteMutation.error instanceof ApiError
            ? deleteMutation.error.message
            : "Could not delete that file."}
        </p>
      ) : null}

      <div className="media-grid">
        {assetsQuery.isPending ? (
          <div className="media-empty-state" role="status" aria-live="polite">
            <div className="media-empty-icon">↻</div>
            <h3>Loading your media…</h3>
            <p>Fetching this project&apos;s files.</p>
          </div>
        ) : assetsQuery.isError ? (
          <div className="media-empty-state" role="alert">
            <div className="media-empty-icon">!</div>
            <h3>We couldn&apos;t load your media</h3>
            <p>
              {assetsQuery.error instanceof ApiError
                ? assetsQuery.error.message
                : "Something went wrong."}
            </p>
            <button
              type="button"
              className="secondary-editor-button"
              onClick={() => void assetsQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="media-empty-state">
            <div className="media-empty-icon">↑</div>
            <h3>{assets.length === 0 ? "No media uploaded yet" : "No media found"}</h3>
            <p>
              {assets.length === 0
                ? "Upload videos, images or audio to start building your library."
                : "Try uploading a file or changing your search/filter."}
            </p>
            <button type="button" className="secondary-editor-button" onClick={openFilePicker}>
              Upload Media
            </button>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <MediaCard
              key={asset.id}
              asset={asset}
              projectId={projectId}
              onDelete={handleDelete}
              deleting={deleteMutation.isPending}
            />
          ))
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        hidden
        multiple
        accept="video/*,image/*,audio/*"
        onChange={handleFileInputChange}
      />
    </section>
  );
}

function MediaCard({
  asset,
  projectId,
  onDelete,
  deleting,
}: {
  asset: MediaAsset;
  projectId: string;
  onDelete: (asset: MediaAsset) => void;
  deleting: boolean;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const kind = assetKind(asset);

  // Poll this asset while it is still uploading/processing; stops as soon as
  // it reaches READY or FAILED.
  const statusQuery = useQuery({
    queryKey: ["media-asset", asset.id],
    queryFn: ({ signal }) => mediaApi.get(asset.id, signal).then((data) => data.asset),
    enabled: isProcessing(asset),
    refetchInterval: (query) => {
      const current = query.state.data;
      if (current && !isProcessing(current)) {
        void queryClient.invalidateQueries({ queryKey: ["media", projectId] });
        return false;
      }
      return 3000;
    },
  });

  const live = statusQuery.data ?? asset;
  const thumbnailReady = live.status === "READY" && live.thumbnail?.status === "READY";

  const thumbnailQuery = useQuery({
    queryKey: ["media-thumbnail", asset.id],
    queryFn: ({ signal }) => mediaApi.objectUrl(mediaApi.thumbnailPath(asset.id), signal),
    enabled: thumbnailReady,
    staleTime: Infinity,
  });

  let preview: React.ReactNode;
  if (live.status === "FAILED") {
    preview = <div className="media-type-icon">⚠</div>;
  } else if (isProcessing(live)) {
    preview = <div className="media-type-icon">↻</div>;
  } else if (thumbnailQuery.data) {
    preview = <img src={thumbnailQuery.data} alt={live.originalFilename} />;
  } else if (kind === "audio") {
    preview = <div className="media-type-icon">🎵</div>;
  } else if (kind === "video") {
    preview = <div className="media-type-icon">▶</div>;
  } else if (kind === "image") {
    preview = <div className="media-type-icon">🖼</div>;
  } else {
    preview = <div className="media-type-icon">📄</div>;
  }

  const statusLabel =
    live.status === "READY"
      ? formatFileSize(live.fileSizeBytes ?? 0)
      : live.status === "FAILED"
        ? "Processing failed"
        : "Processing…";

  function openAsset() {
    if (live.status !== "READY") return;
    if (kind === "video") {
      router.push(`/editor?projectId=${encodeURIComponent(projectId)}&assetId=${encodeURIComponent(live.id)}`);
      return;
    }
    void mediaApi
      .objectUrl(mediaApi.streamPath(live.id))
      .then((url) => window.open(url, "_blank"))
      .catch(() => {
        /* error surfaced by the list/status queries */
      });
  }

  return (
    <article className="media-card" onClick={openAsset}>
      <div className="media-preview">{preview}</div>

      <div className="media-card-content">
        <div className="media-card-info">
          <span className="media-card-name">{live.originalFilename}</span>
          <span className="media-card-meta">{statusLabel}</span>
        </div>

        <button
          type="button"
          className="media-card-menu"
          aria-label={`Delete ${live.originalFilename}`}
          disabled={deleting}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(live);
          }}
        >
          ⋮
        </button>
      </div>
    </article>
  );
}
