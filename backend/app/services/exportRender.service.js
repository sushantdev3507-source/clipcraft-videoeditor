/**
 * The actual ffmpeg invocation for the export/render pipeline.
 *
 * Takes the resolved output of timelineCompiler.service.js's compileTimeline()
 * -- a real source file path plus a normalized clip (trim/speed/rotation/
 * flip/crop/text/volume) -- and a target quality, and produces a single
 * rendered MP4 at a given absolute output path.
 *
 * Mirrors app/services/ffmpeg.service.js's conventions on purpose (same repo,
 * same review already done on that pattern): child_process.execFile with an
 * argument array (never a shell string, so nothing in a filename or in the
 * clip's free-text overlay can be interpreted as a shell command), a
 * dedicated error class, a timeout + maxBuffer, and cleanup of partial output
 * on failure. It reuses ffmpeg.service.js's FfmpegError class itself (rather
 * than declaring a second one) so callers can do one `err instanceof
 * FfmpegError` check regardless of which ffmpeg-shelling module raised it.
 *
 * This module never touches the database and knows nothing about
 * export_jobs -- app/workers/renders.workers.js orchestrates job status
 * around a call to renderExport().
 */

const fs = require("fs");
const fsp = fs.promises;
const { execFile } = require("child_process");
const { FFMPEG_PATH } = require("../config/media");
const { FfmpegError } = require("./ffmpeg.service");
const { ensureParentDir } = require("./storage.service");

const RENDER_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes -- a full re-encode, not a quick proxy/thumbnail
const MAX_BUFFER_BYTES = 20 * 1024 * 1024;

const QUALITY_HEIGHTS = { "720p": 720, "1080p": 1080 };

// A clip's speed only ever comes from timelineCompiler's normalizeClip(),
// which clamps it to VALID_SPEEDS = [0.25, 0.5, 1, 1.5, 2] -- so this is an
// exhaustive lookup, not a general decomposition. atempo's own valid range
// is [0.5, 2.0], which is why 0.25 needs two chained 0.5 filters (0.5 * 0.5).
const ATEMPO_CHAINS = {
  0.25: ["atempo=0.5", "atempo=0.5"],
  0.5: ["atempo=0.5"],
  1: [],
  1.5: ["atempo=1.5"],
  2: ["atempo=2"],
};

const CROP_RATIOS = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
  "4:3": 4 / 3,
};

function runFfmpeg(args, timeoutMs, failureMessage) {
  return new Promise((resolve, reject) => {
    execFile(
      FFMPEG_PATH,
      args,
      { timeout: timeoutMs, maxBuffer: MAX_BUFFER_BYTES },
      (err) => {
        if (err) {
          if (err.killed || err.signal) {
            return reject(new FfmpegError(`${failureMessage} (timed out)`, err));
          }
          if (err.code === "ENOENT") {
            return reject(new FfmpegError("ffmpeg binary not found", err));
          }
          return reject(new FfmpegError(failureMessage, err));
        }
        resolve();
      }
    );
  });
}

/**
 * Resolve a real .ttf/.otf file for drawtext's mandatory `fontfile` option.
 * ffmpeg's drawtext filter needs an actual font file path -- it doesn't
 * fall back to a system default -- and this server can be Linux (this
 * sandbox / most Docker deployments), Windows (the team's own dev
 * machines), or macOS, each with different default font locations and no
 * guarantee fontconfig is even installed. DRAWTEXT_FONT_FILE lets any
 * deployment simply point at a real font instead of relying on one of
 * these guesses existing.
 */
function resolveFontFile() {
  const configured = process.env.DRAWTEXT_FONT_FILE;
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  const candidates = [
    // Linux (this sandbox, most Docker base images)
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    // macOS
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    // Windows
    "C:\\Windows\\Fonts\\arial.ttf",
    "C:\\Windows\\Fonts\\Arial.ttf",
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // keep looking
    }
  }

  return null;
}

/**
 * Escape a value for use inside a single-quoted ffmpeg filtergraph string.
 * Per ffmpeg's own quoting rules (ffmpeg-utils(1) "Quoting and escaping"),
 * everything between a pair of single quotes is taken literally -- including
 * backslashes and colons -- except the single quote character itself, which
 * cannot be embedded and must be produced by leaving the quoted section,
 * emitting an escaped quote, and re-entering it. This is ffmpeg's own
 * filtergraph parser doing the escaping, not a shell -- these functions
 * build an argv array for execFile(), which never goes through a shell.
 */
function escapeForSingleQuotedFilterValue(value) {
  return String(value).replace(/'/g, `'\\''`);
}

function computeCropBox(effectiveWidth, effectiveHeight, cropSpec) {
  const targetRatio = CROP_RATIOS[cropSpec];
  if (!targetRatio || !effectiveWidth || !effectiveHeight) return null;

  const currentRatio = effectiveWidth / effectiveHeight;
  let cropW;
  let cropH;
  if (currentRatio > targetRatio) {
    cropH = effectiveHeight;
    cropW = Math.round(effectiveHeight * targetRatio);
  } else {
    cropW = effectiveWidth;
    cropH = Math.round(effectiveWidth / targetRatio);
  }

  // Keep even dimensions -- yuv420p requires it, and while the scale filter
  // further down the chain would also fix this, there's no reason to hand
  // it an odd crop box in the first place.
  cropW -= cropW % 2;
  cropH -= cropH % 2;

  return cropW > 0 && cropH > 0 ? [cropW, cropH] : null;
}

function buildDrawtextFilter(text, textPosition, targetHeight) {
  const fontFile = resolveFontFile();
  if (!fontFile) {
    throw new Error(
      "This project's edit includes a text overlay, but no font file could be found on the server to render it. " +
        "Set DRAWTEXT_FONT_FILE in the server's .env to a valid .ttf/.otf path."
    );
  }

  const fontsize = Math.max(18, Math.round(targetHeight * 0.045));
  const escapedText = escapeForSingleQuotedFilterValue(text);
  const escapedFontFile = escapeForSingleQuotedFilterValue(fontFile);

  let y;
  if (textPosition === "top") {
    y = "h*0.06";
  } else if (textPosition === "bottom") {
    y = "h-text_h-h*0.06";
  } else {
    y = "(h-text_h)/2";
  }

  return [
    `drawtext=fontfile='${escapedFontFile}'`,
    `text='${escapedText}'`,
    `fontsize=${fontsize}`,
    "fontcolor=white",
    "box=1",
    "boxcolor=black@0.5",
    "boxborderw=12",
    "x=(w-text_w)/2",
    `y=${y}`,
  ].join(":");
}

/**
 * Build the full ffmpeg argv for one export render. Pure and synchronous --
 * no filesystem or process access -- so it can be unit-tested (and is used
 * that way) without ever shelling out.
 *
 * @param {{ sourcePath: string, width: number|null, height: number|null, hasAudio: boolean }} source
 * @param {object} clip a clip already normalized by timelineCompiler.service.js
 * @param {'720p'|'1080p'} quality
 * @param {string} outputAbsolutePath
 * @returns {string[]} argv (excluding the ffmpeg binary itself)
 */
function buildRenderArgs(source, clip, quality, outputAbsolutePath) {
  const targetHeight = QUALITY_HEIGHTS[quality] || QUALITY_HEIGHTS["1080p"];
  const args = ["-y"];

  // Trim via input-side -ss/-t: both placed BEFORE -i so ffmpeg applies them
  // as input options -- fast, direct-seek trimming of the source itself.
  // Putting -t after -i instead (a common mistake) makes it an *output*
  // duration cap applied after every filter, which silently produces the
  // wrong length once a speed filter is in play (e.g. a 4s trim sped up
  // 1.5x is a ~2.67s *output*, so an output-side "-t 4" cap would never
  // even engage, and the actual output would run all the way to the end
  // of the source instead of stopping at trimEnd).
  const trimStart = typeof clip.trimStart === "number" && clip.trimStart > 0 ? clip.trimStart : 0;
  const trimDuration =
    typeof clip.trimEnd === "number" && clip.trimEnd > trimStart ? clip.trimEnd - trimStart : null;

  if (trimStart > 0) {
    args.push("-ss", String(trimStart));
  }
  if (trimDuration) {
    args.push("-t", String(trimDuration));
  }
  args.push("-i", source.sourcePath);

  // ---- video filter chain ----
  const vf = [];

  if (clip.speed !== 1) {
    vf.push(`setpts=PTS/${clip.speed}`);
  }

  if (clip.rotation === 90) {
    vf.push("transpose=1");
  } else if (clip.rotation === 180) {
    vf.push("hflip", "vflip");
  } else if (clip.rotation === 270) {
    vf.push("transpose=2");
  }

  if (clip.flipX === -1) vf.push("hflip");
  if (clip.flipY === -1) vf.push("vflip");

  if (clip.crop !== "original") {
    const rotatedDims = clip.rotation === 90 || clip.rotation === 270;
    const effectiveWidth = rotatedDims ? source.height : source.width;
    const effectiveHeight = rotatedDims ? source.width : source.height;
    const cropBox = computeCropBox(effectiveWidth, effectiveHeight, clip.crop);
    if (cropBox) {
      vf.push(`crop=${cropBox[0]}:${cropBox[1]}`);
    }
  }

  // Applied after crop so the requested aspect ratio survives; -2 keeps
  // width even (required for yuv420p) while preserving aspect ratio.
  vf.push(`scale=-2:${targetHeight}`);

  // Applied last so font sizing (relative to targetHeight) matches the
  // frame the viewer actually sees, regardless of source resolution.
  if (clip.text) {
    vf.push(buildDrawtextFilter(clip.text, clip.textPosition, targetHeight));
  }

  args.push("-vf", vf.join(","));

  // ---- audio ----
  const dropAudio = clip.muted || !source.hasAudio;
  if (dropAudio) {
    args.push("-an");
  } else {
    const af = [...(ATEMPO_CHAINS[clip.speed] || []), `volume=${clip.volume}`];
    args.push("-af", af.join(","));
    args.push("-c:a", "aac", "-b:a", "192k");
  }

  args.push(
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputAbsolutePath
  );

  return args;
}

/**
 * Render one export job's compiled clip to `outputAbsolutePath`. Cleans up
 * a partial output file if ffmpeg fails partway through.
 *
 * @param {{ source: object, clip: object, quality: '720p'|'1080p', outputAbsolutePath: string }} params
 */
async function renderExport({ source, clip, quality, outputAbsolutePath }) {
  await ensureParentDir(outputAbsolutePath);

  // buildRenderArgs can throw synchronously (e.g. no font file for a text
  // overlay) -- let that happen before touching the filesystem/ffmpeg.
  const args = buildRenderArgs(source, clip, quality, outputAbsolutePath);

  try {
    await runFfmpeg(args, RENDER_TIMEOUT_MS, "Video export failed");
  } catch (err) {
    await fsp.unlink(outputAbsolutePath).catch(() => {});
    throw err;
  }

  return { outputAbsolutePath };
}

module.exports = {
  renderExport,
  buildRenderArgs,
  computeCropBox,
  resolveFontFile,
  QUALITY_HEIGHTS,
};
