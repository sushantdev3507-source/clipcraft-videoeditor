// ClipCraft shared API client.
// Single place that knows the backend base URL, attaches the
// `Authorization: Bearer <token>` header, parses JSON, sends multipart uploads
// and turns non-2xx responses into a typed ApiError.
//
// Base URL comes from NEXT_PUBLIC_API_BASE_URL so no deployment URL is hardcoded in
// components. Only endpoints documented by the backend team are used here.

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "clipcraft_auth_token";

/* -------------------------------------------------- token storage */

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string, remember = true) {
  if (typeof window === "undefined") return;
  try {
    clearToken();
    (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable — request-scoped token only */
  }
}

export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------- errors */

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function fallbackMessage(status: number) {
  switch (status) {
    case 400:
      return "That request was rejected. Please check the details and try again.";
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find that item.";
    case 409:
      return "That conflicts with something that already exists.";
    case 413:
      return "That file is too large.";
    case 415:
      return "That file type isn't supported.";
    default:
      return status >= 500
        ? "The server had a problem. Please try again in a moment."
        : `Request failed (${status}).`;
  }
}

/** Called when any authenticated request comes back 401 (token expired/invalid). */
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/* -------------------------------------------------- core request */

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JSON body — serialised, Content-Type: application/json */
  json?: unknown;
  /** multipart body — Content-Type is left to the browser (keeps the boundary) */
  formData?: FormData;
  /** send the stored bearer token (default true) */
  auth?: boolean;
  signal?: AbortSignal;
};

async function send(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = "GET", json, formData, auth = true, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (json !== undefined) headers["Content-Type"] = "application/json";
  // Never set Content-Type for FormData: the browser adds the multipart
  // boundary itself and overriding it breaks the upload.

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    const body: BodyInit | undefined =
      formData ?? (json !== undefined ? JSON.stringify(json) : undefined);
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ApiError(0, "Can't reach the ClipCraft server. Check your connection and try again.");
  }

  if (!response.ok) {
    let payload: unknown = null;
    let message = "";
    try {
      const text = await response.text();
      if (text) {
        try {
          payload = JSON.parse(text);
          const record = payload as Record<string, unknown> | null;
          const raw = record?.["message"] ?? record?.["error"];
          if (typeof raw === "string") message = raw;
        } catch {
          message = text.slice(0, 200);
        }
      }
    } catch {
      /* body unreadable */
    }

    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    throw new ApiError(response.status, message || fallbackMessage(response.status), payload);
  }

  return response;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Authenticated binary fetch (thumbnails, stream, preview) as an object URL. */
async function requestObjectUrl(path: string, signal?: AbortSignal): Promise<string> {
  const response = await send(path, signal ? { signal } : {});
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/* -------------------------------------------------- domain types */

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  auth_provider?: string;
};

/**
 * Matches the `timeline_json` shape the backend's timelineCompiler.service.js
 * validates/normalizes (see that file's header comment) -- this is what
 * EditorWorkspace.tsx's snapshot gets translated into for
 * `PUT /api/v1/projects/:id/timeline`, and what the export pipeline reads
 * back to render. `tracks`/`clips` are arrays for forward-compatibility with
 * a real multi-clip timeline, but today the editor only ever produces one
 * track with one clip.
 */
export type TimelineClip = {
  assetId: string;
  trimStart: number | null;
  trimEnd: number | null;
  speed: number; // one of 0.25, 0.5, 1, 1.5, 2
  volume: number; // 0..1
  muted: boolean;
  rotation: number; // one of 0, 90, 180, 270
  flipX: 1 | -1;
  flipY: 1 | -1;
  crop: "original" | "16:9" | "9:16" | "1:1" | "4:3";
  text: string;
  textPosition: "center" | "top" | "bottom";
};

export type TimelineJson = {
  tracks: { clips: TimelineClip[] }[];
};

export type Project = {
  id: string;
  title?: string;
  aspect_ratio?: string;
  fps?: number;
  status?: string;
  timeline_json?: TimelineJson;
  revision?: number;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AssetStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
export type DerivedStatus = "NOT_APPLICABLE" | "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type MediaAsset = {
  id: string;
  projectId: string;
  originalFilename: string;
  mediaType?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  status: AssetStatus;
  durationSeconds?: number;
  width?: number;
  height?: number;
  proxy?: { status: DerivedStatus };
  thumbnail?: { status: DerivedStatus };
  waveform?: { status: DerivedStatus };
  createdAt?: string;
};

/* -------------------------------------------------- auth */

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ message: string; user: AuthUser }>("/api/v1/auth/register", {
      method: "POST",
      json: body,
      auth: false,
    }),

  login: (body: { email: string; password: string }) =>
    request<{ message: string; token: string; user: AuthUser }>("/api/v1/auth/login", {
      method: "POST",
      json: body,
      auth: false,
    }),

  me: (signal?: AbortSignal) =>
    request<{ user: AuthUser }>("/api/v1/auth/me", signal ? { signal } : {}),

  updateProfile: (body: { name?: string; email?: string }) =>
    request<{ message: string; user: AuthUser }>("/api/v1/auth/profile", {
      method: "PUT",
      json: body,
    }),
};

/* -------------------------------------------------- projects */

export const projectsApi = {
  list: (signal?: AbortSignal) =>
    request<{ projects: Project[] }>("/api/v1/projects", signal ? { signal } : {}),

  create: (body: { title: string; aspect_ratio?: string; fps?: number }) =>
    request<{ message: string; project: Project }>("/api/v1/projects", {
      method: "POST",
      json: body,
    }),

  get: (id: string, signal?: AbortSignal) =>
    request<{ project: Project }>(`/api/v1/projects/${id}`, signal ? { signal } : {}),

  remove: (id: string) =>
    request<{ message?: string }>(`/api/v1/projects/${id}`, { method: "DELETE" }),

  /**
   * Saves the editor's timeline to the project's real `timeline_json`.
   * Optimistic concurrency: the backend rejects with 409 (ApiError with
   * that status) if `revision` doesn't match the project's current
   * revision — callers should refetch the project and retry/merge rather
   * than blindly resend the same revision.
   */
  saveTimeline: (id: string, body: { timeline_json: TimelineJson; revision: number }) =>
    request<{ message: string; project: Project }>(`/api/v1/projects/${id}/timeline`, {
      method: "PUT",
      json: body,
    }),
};

/* -------------------------------------------------- media */

export const MEDIA_SIZE_LIMITS = {
  video: 500 * 1024 * 1024,
  audio: 200 * 1024 * 1024,
  image: 25 * 1024 * 1024,
} as const;

export const mediaApi = {
  listForProject: (projectId: string, signal?: AbortSignal) =>
    request<{ assets: MediaAsset[] }>(
      `/api/v1/projects/${projectId}/media`,
      signal ? { signal } : {},
    ),

  get: (id: string, signal?: AbortSignal) =>
    request<{ asset: MediaAsset }>(`/api/v1/media/${id}`, signal ? { signal } : {}),

  upload: (projectId: string, file: File) => {
    const form = new FormData();
    // Field order matters to the backend: projectId first, then file.
    form.append("projectId", projectId);
    form.append("file", file);
    return request<{ asset: MediaAsset }>("/api/v1/media/upload", {
      method: "POST",
      formData: form,
    });
  },

  remove: (id: string) => request<void>(`/api/v1/media/${id}`, { method: "DELETE" }),

  /** Authenticated blob URL for <video>/<audio>/<img>. */
  objectUrl: (path: string, signal?: AbortSignal) => requestObjectUrl(path, signal),

  streamPath: (id: string) => `/api/v1/media/${id}/stream`,
  thumbnailPath: (id: string) => `/api/v1/media/${id}/thumbnail`,
  waveformPath: (id: string) => `/api/v1/media/${id}/waveform`,
};

export function isProcessing(asset: Pick<MediaAsset, "status">) {
  return asset.status === "UPLOADING" || asset.status === "PROCESSING";
}

/* -------------------------------------------------- export */

export type ExportFormat = "mp4";
export type ExportQuality = "720p" | "1080p";
export type ExportStatus = "queued" | "processing" | "completed" | "failed";

export type ExportJob = {
  id: string;
  project_id: string;
  user_id: string;
  format: ExportFormat;
  quality: ExportQuality;
  status: ExportStatus;
  error_message: string | null;
  output_storage_key: string | null;
  created_at: string;
  updated_at: string;
};

export function isExportInFlight(job: Pick<ExportJob, "status">) {
  return job.status === "queued" || job.status === "processing";
}

export const exportApi = {
  /** Renders the project's currently-saved timeline_json -- save the timeline first. */
  create: (body: { projectId: string; format?: ExportFormat; quality?: ExportQuality }) =>
    request<{ message: string; job: ExportJob }>("/api/v1/export", {
      method: "POST",
      json: body,
    }),

  get: (id: string, signal?: AbortSignal) =>
    request<{ job: ExportJob }>(`/api/v1/export/${id}`, signal ? { signal } : {}),

  listForProject: (projectId: string, signal?: AbortSignal) =>
    request<{ count: number; jobs: ExportJob[] }>(
      `/api/v1/export?projectId=${encodeURIComponent(projectId)}`,
      signal ? { signal } : {},
    ),

  retry: (id: string) =>
    request<{ message: string; job: ExportJob }>(`/api/v1/export/${id}/retry`, { method: "POST" }),

  /** Authenticated blob URL for a completed export's rendered file -- hand this to a temporary <a download> to trigger a real browser save. */
  downloadUrl: (id: string, signal?: AbortSignal) =>
    requestObjectUrl(`/api/v1/export/${id}/download`, signal),
};
