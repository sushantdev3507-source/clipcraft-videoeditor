const { getNextJob, addToQueue } = require("../services/queue.service");
const { compileTimeline } = require("../services/timelineCompiler.service");
const { renderExport } = require("../services/exportRender.service");
const storage = require("../services/storage.service");
const pool = require("../config/db");

let isProcessing = false;


// ==========================================
// Load queued jobs from PostgreSQL
// ==========================================
async function loadQueuedJobs() {
  try {
    const result = await pool.query(
      `SELECT *
       FROM export_jobs
       WHERE status = $1
       ORDER BY created_at ASC`,
      ["queued"]
    );

    result.rows.forEach((job) => {
      addToQueue(job);
    });

    console.log(`Loaded ${result.rows.length} queued job(s)`);
  } catch (error) {
    console.error("QUEUE LOAD ERROR:", error.message);
  }
}


// ==========================================
// Process one render job
// ==========================================
// Jobs are keyed by project_id/user_id, not raw file paths -- the worker
// re-derives the actual source file itself, server-side, from the
// project's current timeline_json via timelineCompiler.service.js (which
// resolves the referenced media asset through mediaResolver.service.js).
// Re-compiling here rather than trusting anything captured at job-creation
// time also means a job always renders against the project's *current*
// saved edit, and fails cleanly if the project/asset became unavailable
// in between (deleted, asset reprocessing failed, etc.).
async function processQueue() {
  // Prevent multiple jobs from running simultaneously
  if (isProcessing) {
    return;
  }

  const job = getNextJob();

  if (!job) {
    return;
  }

  isProcessing = true;

  try {
    console.log(`Starting render job: ${job.id}`);

    // Mark job as processing
    await pool.query(
      `UPDATE export_jobs
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      ["processing", job.id]
    );

    const projectResult = await pool.query(
      `SELECT timeline_json FROM projects WHERE id = $1 AND user_id = $2`,
      [job.project_id, job.user_id]
    );
    if (projectResult.rows.length === 0) {
      throw new Error("The project for this export job no longer exists.");
    }

    const compiled = await compileTimeline(projectResult.rows[0].timeline_json, job.project_id, job.user_id);
    if (!compiled.ok) {
      throw new Error(compiled.message);
    }

    const outputStorageKey = storage.exportOutputKey(job.id, job.format);
    const outputAbsolutePath = storage.resolveAbsolutePath(outputStorageKey);

    await renderExport({
      source: compiled.source,
      clip: compiled.clip,
      quality: job.quality,
      outputAbsolutePath,
    });

    // Mark job as completed
    await pool.query(
      `UPDATE export_jobs
       SET status = $1,
           error_message = NULL,
           output_storage_key = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      ["completed", outputStorageKey, job.id]
    );

    console.log(`Render completed: ${job.id}`);

  } catch (error) {
    console.error(`Render failed: ${job.id}`);
    console.error("ERROR MESSAGE:", error.message);

    // Mark job as failed
    try {
      await pool.query(
        `UPDATE export_jobs
         SET status = $1,
             error_message = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        ["failed", error.message, job.id]
      );
    } catch (dbError) {
      console.error(
        "FAILED TO UPDATE JOB STATUS:",
        dbError.message
      );
    }

  } finally {
    isProcessing = false;
  }
}


// ==========================================
// Initialize queued jobs
// ==========================================
loadQueuedJobs();


// ==========================================
// Start queue worker
// ==========================================
// .unref() tells Node not to count this timer when deciding whether the
// process has anything left to do. The interval still fires normally for as
// long as anything else keeps the process alive (e.g. the real HTTP server
// listening) -- this only matters for a script that requires this file
// (directly or via app/server.js) and then has nothing else running: without
// .unref(), that script can never exit on its own, which is exactly what was
// happening to tests/api.test.js and tests/projectMedia.test.js (both load
// app/server.js, which requires this file) -- every one of their subtests
// passed, but `node --test` itself hung past the last one until its own
// timeout killed it. No behavior change for the app when actually running.
const queueInterval = setInterval(processQueue, 1000);
queueInterval.unref();


module.exports = {
  processQueue,
  loadQueuedJobs
};
