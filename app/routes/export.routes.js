const express = require("express");

const {
  exportVideo,
  getExportJob,
  getAllExportJobs,
  retryExportJob,
  downloadExport,
  getQueueStatusController,
  getQueueSummary
} = require("../controllers/export.controller");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Every export endpoint deals with a specific user's projects/jobs/rendered
// files -- none of it was ever meant to be reachable unauthenticated. The
// original scaffold never wired this in, which (along with export_jobs not
// existing at all) is why these routes were never actually safe to expose.
//
// Scoped to the "/export" prefix specifically (NOT a bare router.use(...),
// which would match every path) because this router is mounted at the
// shared "/api/v1" prefix in app/server.js, alongside completely unrelated
// routes (auth, health check, etc.) that must NOT require an export-job
// bearer token to reach.
router.use("/export", authMiddleware);

// Create export job
router.post("/export", exportVideo);

// Get all export jobs
router.get("/export", getAllExportJobs);

// Get render queue status
router.get("/export/queue/status", getQueueStatusController);

// Get export queue summary
router.get("/export/queue/summary", getQueueSummary);

// Retry failed export job
router.post("/export/:id/retry", retryExportJob);

// Download completed export
router.get("/export/:id/download", downloadExport);

// Get export job status
router.get("/export/:id", getExportJob);

module.exports = router;