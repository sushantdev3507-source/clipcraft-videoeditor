/**
 * Timeline compiler: turns a project's `timeline_json` (the shape the
 * frontend editor saves via PUT /api/v1/projects/:id/timeline) into a
 * concrete, resolved render spec the export pipeline can hand straight to
 * ffmpeg -- source file + every effect the editor supports.
 *
 * `projects.timeline_json` defaults to `{"tracks":[]}` (see
 * database/schema.sql) -- this compiler follows that same `tracks` shape so
 * it stays forward-compatible with a real multi-track/multi-clip timeline
 * later, even though the current editor (see
 * src/components/editor/EditorWorkspace.tsx in the frontend repo) only ever
 * produces a single track with a single clip:
 *
 *   {
 *     "tracks": [
 *       { "clips": [ {
 *         "assetId": "<media_assets.id>",
 *         "trimStart": number | null,
 *         "trimEnd": number | null,
 *         "speed": number,          // one of 0.25, 0.5, 1, 1.5, 2
 *         "volume": number,         // 0..1
 *         "muted": boolean,
 *         "rotation": number,       // one of 0, 90, 180, 270
 *         "flipX": 1 | -1,
 *         "flipY": 1 | -1,
 *         "crop": "original" | "16:9" | "9:16" | "1:1" | "4:3",
 *         "text": string,
 *         "textPosition": "center" | "top" | "bottom"
 *       } ] }
 *     ]
 *   }
 *
 * This module never touches the filesystem or spawns ffmpeg itself -- it
 * only validates the JSON shape and, via mediaResolver.service.js, resolves
 * the referenced asset to a real, existing source file. app/services/
 * exportRender.service.js takes this compiler's output and does the actual
 * rendering.
 */

const { resolveProjectAsset, RESOLUTION_STATUS, PURPOSES } = require("./mediaResolver.service");

const VALID_SPEEDS = [0.25, 0.5, 1, 1.5, 2];
const VALID_ROTATIONS = [0, 90, 180, 270];
const VALID_CROPS = ["original", "16:9", "9:16", "1:1", "4:3"];
const VALID_TEXT_POSITIONS = ["center", "top", "bottom"];

const REASON = {
  NO_CLIP: "NO_CLIP", // timeline_json has no clip yet (nothing edited/saved)
  INVALID_TIMELINE: "INVALID_TIMELINE", // malformed shape/values
  ASSET_FORBIDDEN: "ASSET_FORBIDDEN",
  ASSET_NOT_FOUND: "ASSET_NOT_FOUND",
  ASSET_NOT_READY: "ASSET_NOT_READY",
  ASSET_SOURCE_MISSING: "ASSET_SOURCE_MISSING",
};

/** Pulls the single clip this editor produces out of the tracks shape. Returns null if there isn't one yet. */
function extractClip(timelineJson) {
  const tracks = timelineJson && Array.isArray(timelineJson.tracks) ? timelineJson.tracks : [];
  for (const track of tracks) {
    const clips = track && Array.isArray(track.clips) ? track.clips : [];
    if (clips.length > 0 && clips[0] && typeof clips[0] === "object") {
      return clips[0];
    }
  }
  return null;
}

function clampNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Validates and normalizes a raw clip object from timeline_json. Unknown or
 * out-of-range values fall back to their safe defaults rather than
 * rejecting the whole export -- the editor only ever writes values from its
 * own fixed control set, so this is a defensive floor, not the primary
 * validation (a client that bypassed the editor UI entirely could still
 * only ever produce a normal, renderable clip out of this).
 */
function normalizeClip(rawClip) {
  const speed = VALID_SPEEDS.includes(rawClip.speed) ? rawClip.speed : 1;
  const rotation = VALID_ROTATIONS.includes(rawClip.rotation) ? rawClip.rotation : 0;
  const crop = VALID_CROPS.includes(rawClip.crop) ? rawClip.crop : "original";
  const textPosition = VALID_TEXT_POSITIONS.includes(rawClip.textPosition) ? rawClip.textPosition : "center";
  const volume = clampNumber(rawClip.volume, 1);

  return {
    assetId: typeof rawClip.assetId === "string" ? rawClip.assetId : null,
    trimStart: typeof rawClip.trimStart === "number" && rawClip.trimStart >= 0 ? rawClip.trimStart : null,
    trimEnd: typeof rawClip.trimEnd === "number" && rawClip.trimEnd > 0 ? rawClip.trimEnd : null,
    speed,
    volume: Math.min(Math.max(volume, 0), 1),
    muted: rawClip.muted === true,
    rotation,
    flipX: rawClip.flipX === -1 ? -1 : 1,
    flipY: rawClip.flipY === -1 ? -1 : 1,
    crop,
    text: typeof rawClip.text === "string" ? rawClip.text.slice(0, 200) : "",
    textPosition,
  };
}

/**
 * @param {object} timelineJson project.timeline_json, already parsed
 * @param {string} projectId
 * @param {string} userId the authenticated caller -- passed straight through
 *   to mediaResolver's ownership check, never trusted from anywhere else.
 * @returns {Promise<
 *   | { ok: false, reason: string, message: string }
 *   | { ok: true, clip: object, source: { sourcePath, width, height, durationSeconds, hasAudio } }
 * >}
 */
async function compileTimeline(timelineJson, projectId, userId) {
  const rawClip = extractClip(timelineJson);
  if (!rawClip) {
    return { ok: false, reason: REASON.NO_CLIP, message: "This project has no edited video to export yet." };
  }

  const clip = normalizeClip(rawClip);
  if (!clip.assetId) {
    return { ok: false, reason: REASON.INVALID_TIMELINE, message: "This project's saved edit is missing its video." };
  }

  const resolution = await resolveProjectAsset(projectId, clip.assetId, { userId, purpose: PURPOSES.RENDER });

  switch (resolution.status) {
    case RESOLUTION_STATUS.FORBIDDEN:
      return { ok: false, reason: REASON.ASSET_FORBIDDEN, message: "You do not have access to this project." };
    case RESOLUTION_STATUS.NOT_FOUND:
    case RESOLUTION_STATUS.WRONG_PROJECT:
      return { ok: false, reason: REASON.ASSET_NOT_FOUND, message: "The video in this project's edit could not be found." };
    case RESOLUTION_STATUS.NOT_READY:
      return {
        ok: false,
        reason: REASON.ASSET_NOT_READY,
        message: "The video is still processing on the server -- try exporting again shortly.",
      };
    case RESOLUTION_STATUS.SOURCE_MISSING:
      return { ok: false, reason: REASON.ASSET_SOURCE_MISSING, message: "The video's file is missing from storage." };
    case RESOLUTION_STATUS.READY:
      return {
        ok: true,
        clip,
        source: {
          sourcePath: resolution.asset.sourcePath,
          width: resolution.asset.width,
          height: resolution.asset.height,
          durationSeconds: resolution.asset.durationSeconds,
          hasAudio: resolution.asset.hasAudio,
        },
      };
    default:
      return { ok: false, reason: REASON.INVALID_TIMELINE, message: "This project's edit could not be resolved." };
  }
}

module.exports = { compileTimeline, extractClip, normalizeClip, REASON, VALID_SPEEDS, VALID_ROTATIONS, VALID_CROPS };
