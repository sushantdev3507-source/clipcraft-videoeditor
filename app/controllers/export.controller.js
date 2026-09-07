/**
 * Export/render job controller.
 *
 * Rewritten from the original scaffold, which:
 *   - took raw {inputFile, outputFile} filesystem paths straight from the
 *     request body (an arbitrary-file-read/traversal risk, since it did
 *     `fs.existsSync(cleanInputFile)` on a client-supplied path with no
 *     sandboxing at all),
 *   - had no auth (export.routes.js mounted every handler with no
 *     authMiddleware), so any of these ownership-free queries were
 *     reachable by anyone who could reach the API at all,
 *   - generated job ids via `Date.now().toString()` instead of a real id,
 *   - and queried a table (export_jobs) that nothing ever created --
 *     confirmed by grepping every boot/test log in this repo's history,
 *     every one of these endpoints has been 500ing since the feature was
 *     first scaffolded.
 *
 * This version instead:
 *   - accepts only {projectId, format, quality} -- never a filesystem path --
 *     and resolves the actual input file itself, server-side, from the
 *     project's own timeline_json + media_assets via
 *     timelineCompiler.service.js (which in turn uses
 *     mediaResolver.service.js, the sanctioned integration seam for that),
 *   - requires authMiddleware (see export.routes.js) and scopes every query
 *     to req.user.userId, exactly like projects.js / media.controller.js,
 *   - uses real UUIDs (export_jobs.id defaults to gen_random_uuid(), see
 *     005_export_jobs.sql),
 *   - follows this module's established ApiError / errorHandler convention
 *     instead of ad hoc res.status(...).json(...) error shapes, and
 *   - streams the completed file back via storage.service.js's
 *     traversal-checked resolveAbsolutePath() + the existing Range-aware
 *     streamFileWithRange() helper, instead of res.download() on a raw,
 *     unchecked client-influenced path.
 */

const pool = require("../config/db");
const { ApiError } = require("../utils/apiError");
const { isUuid } = require("../utils/isUuid");
const { streamFileWithRange } = require("../utils/rangeStream");
const storage = require("../services/storage.service");
const { compileTimeline, REASON } = require("../services/timelineCompiler.service");
const { addToQueue, getQueueStatus } = require("../services/queue.service");

const VALID_FORMATS = ["mp4"];
const VALID_QUALITIES = ["720p", "1080p"];

/** Maps a failed compileTimeline() result to the right HTTP-level ApiError. */
function compileFailureToApiError(compiled) {
  switch (compiled.reason) {
    case REASON.ASSET_FORBIDDEN:
      return ApiError.forbidden(compiled.message);
    case REASON.ASSET_NOT_FOUND:
      return ApiError.notFound(compiled.message);
    case REASON.NO_CLIP:
    case REASON.INVALID_TIMELINE:
      return ApiError.badRequest(compiled.message, "NOTHING_TO_EXPORT");
    case REASON.ASSET_NOT_READY:
      return new ApiError(409, "ASSET_NOT_READY", compiled.message);
    case REASON.ASSET_SOURCE_MISSING:
      return ApiError.internal(compiled.message);
    default:
      return ApiError.badRequest(compiled.message || "This project's edit could not be exported.");
  }
}

// ==========================================
// 1. Create Export Job
// ==========================================
async function exportVideo(req, res) {
  const { projectId, format, quality } = req.body || {};

  if (!isUuid(projectId)) {
    throw ApiError.badRequest("projectId is required and must be a valid project id");
  }

  const resolvedFormat = format === undefined ? "mp4" : format;
  const resolvedQuality = quality === undefined ? "1080p" : quality;

  if (!VALID_FORMATS.includes(resolvedFormat)) {
    throw ApiError.badRequest(`format must be one of: ${VALID_FORMATS.join(", ")}`);
  }
  if (!VALID_QUALITIES.includes(resolvedQuality)) {
    throw ApiError.badRequest(`quality must be one of: ${VALID_QUALITIES.join(", ")}`);
  }

  const projectResult = await pool.query(
    `SELECT id, timeline_json FROM projects WHERE id = $1 AND user_id = $2`,
    [projectId, req.user.userId]
  );

  if (projectResult.rows.length === 0) {
    // Ownership-scoped lookup, so this also covers "exists but isn't yours"
    // without revealing the difference -- same pattern as projects.js.
    throw ApiError.notFound("Project not found");
  }

  const project = projectResult.rows[0];

  // Validate + resolve the real source file up front, at job-creation time,
  // so a doomed export never even reaches the queue -- the same
  // mediaResolver-backed compiler the worker itself will use to actually
  // render, called here purely for fast validation.
  const compiled = await compileTimeline(project.timeline_json, projectId, req.user.userId);
  if (!compiled.ok) {
    throw compileFailureToApiError(compiled);
  }

  const insertResult = await pool.query(
    `INSERT INTO export_jobs (project_id, user_id, format, quality, status)
     VALUES ($1, $2, $3, $4, 'queued')
     RETURNING *`,
    [projectId, req.user.userId, resolvedFormat, resolvedQuality]
  );

  const job = insertResult.rows[0];
  addToQueue(job);

  res.status(202).json({
    message: "Video export added to queue",
    job,
  });
}

// ==========================================
// 2. Get Single Export Job
// ==========================================
async function getExportJob(req, res) {
  const { id } = req.params;
  if (!isUuid(id)) {
    throw ApiError.notFound("Export job not found");
  }

  const result = await pool.query(
    `SELECT id, project_id, user_id, format, quality, status, error_message,
            output_storage_key, created_at, updated_at
     FROM export_jobs
     WHERE id = $1 AND user_id = $2`,
    [id, req.user.userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound("Export job not found");
  }

  res.json({ job: result.rows[0] });
}

// ==========================================
// 3. Get All Export Jobs (scoped to the caller, optionally by project)
// ==========================================
async function getAllExportJobs(req, res) {
  const { projectId } = req.query;

  const params = [req.user.userId];
  let where = "user_id = $1";
  if (projectId !== undefined) {
    if (!isUuid(projectId)) {
      throw ApiError.badRequest("projectId must be a valid project id");
    }
    params.push(projectId);
    where += ` AND project_id = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT id, project_id, user_id, format, quality, status, error_message,
            output_storage_key, created_at, updated_at
     FROM export_jobs
     WHERE ${where}
     ORDER BY created_at DESC`,
    params
  );

  res.json({ count: result.rows.length, jobs: result.rows });
}

// ==========================================
// 4. Retry Failed Export Job
// ==========================================
async function retryExportJob(req, res) {
  const { id } = req.params;
  if (!isUuid(id)) {
    throw ApiError.notFound("Export job not found");
  }

  const result = await pool.query(
    `SELECT * FROM export_jobs WHERE id = $1 AND user_id = $2`,
    [id, req.user.userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound("Export job not found");
  }

  const job = result.rows[0];
  if (job.status !== "failed") {
    throw ApiError.badRequest("Only failed export jobs can be retried", "NOT_FAILED");
  }

  // Re-validate the timeline at retry time too -- the project's edit may
  // have changed (or broken) since the original attempt was queued.
  const projectResult = await pool.query(
    `SELECT timeline_json FROM projects WHERE id = $1 AND user_id = $2`,
    [job.project_id, req.user.userId]
  );
  if (projectResult.rows.length === 0) {
    throw ApiError.notFound("The project for this export job no longer exists");
  }
  const compiled = await compileTimeline(projectResult.rows[0].timeline_json, job.project_id, req.user.userId);
  if (!compiled.ok) {
    throw compileFailureToApiError(compiled);
  }

  const updatedResult = await pool.query(
    `UPDATE export_jobs
     SET status = 'queued', error_message = NULL, output_storage_key = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  const updatedJob = updatedResult.rows[0];
  addToQueue(updatedJob);

  res.status(202).json({ message: "Export job added to retry queue", job: updatedJob });
}

// ==========================================
// 5. Download Completed Export
// ==========================================
async function downloadExport(req, res) {
  const { id } = req.params;
  if (!isUuid(id)) {
    throw ApiError.notFound("Export job not found");
  }

  const result = await pool.query(
    `SELECT id, status, format, output_storage_key FROM export_jobs WHERE id = $1 AND user_id = $2`,
    [id, req.user.userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound("Export job not found");
  }

  const job = result.rows[0];

  if (job.status !== "completed") {
    throw ApiError.badRequest("Export is not completed yet", "EXPORT_NOT_READY");
  }
  if (!job.output_storage_key) {
    // Shouldn't happen -- the worker only ever marks a job completed after
    // successfully writing output_storage_key -- but fail loudly rather
    // than streaming nothing if the two ever get out of sync.
    throw ApiError.internal("This export has no output file on record");
  }

  const absolutePath = storage.resolveAbsolutePath(job.output_storage_key);
  const fileExists = await storage.exists(job.output_storage_key);
  if (!fileExists) {
    throw ApiError.notFound("The rendered file is missing from storage");
  }

  res.setHeader("Content-Disposition", `attachment; filename="clipcraft-export-${job.id}.${job.format}"`);
  await streamFileWithRange(req, res, absolutePath, "video/mp4");
}

// ==========================================
// 6. Get Queue Status (scoped to the caller's own jobs -- the underlying
//    queue is a single process-wide in-memory array shared by every user,
//    so this must never hand back other users' project ids/job rows)
// ==========================================
function getQueueStatusController(req, res) {
  const status = getQueueStatus();
  const mine = status.jobs.filter((job) => job.user_id === req.user.userId);

  res.json({
    message: "Render queue status",
    queue: { length: mine.length, jobs: mine },
  });
}

// ==========================================
// 7. Get Queue Summary (scoped to the caller)
// ==========================================
async function getQueueSummary(req, res) {
  const result = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'queued') AS queued,
       COUNT(*) FILTER (WHERE status = 'processing') AS processing,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed
     FROM export_jobs
     WHERE user_id = $1`,
    [req.user.userId]
  );

  res.json({ message: "Export queue summary", summary: result.rows[0] });
}

module.exports = {
  exportVideo,
  getExportJob,
  getAllExportJobs,
  retryExportJob,
  downloadExport,
  getQueueStatusController,
  getQueueSummary,
};
