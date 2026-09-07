/**
 * Media Management API. Mounted at /api/v1/media in app/server.js.
 *
 * Cutover: this used to require the isolated dev-auth middleware (see
 * app/middleware/devAuth.js) until Member 1's real auth landed -- it now
 * has, so every route here is gated by the same real authMiddleware used by
 * app/routes/auth.js and app/routes/projects.js. A token from
 * POST /api/v1/auth/login is required; the old dev-only token issued by
 * POST /api/v1/dev/login is no longer accepted here.
 *
 * POST   /api/v1/media/upload         multipart/form-data; fields MUST be
 *                                      sent in this order: `projectId`
 *                                      (text) then `file` (the media file).
 * GET    /api/v1/media?projectId=...  list media assets for a project
 * GET    /api/v1/media/:id            get one asset's metadata/status
 * GET    /api/v1/media/:id/stream     HTTP Range-capable playback
 *                                      (?variant=original to force the
 *                                      original file instead of the proxy)
 * GET    /api/v1/media/:id/proxy      the 360p proxy file directly (Sprint 3)
 * GET    /api/v1/media/:id/thumbnail  JPEG thumbnail
 * GET    /api/v1/media/:id/waveform   waveform peaks JSON
 * DELETE /api/v1/media/:id            deletes the asset + all its files
 */

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const mediaController = require("../controllers/media.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/upload", mediaController.upload);
router.get("/", mediaController.list);
router.get("/:id", mediaController.getOne);
router.get("/:id/stream", mediaController.streamMedia);
router.get("/:id/proxy", mediaController.getProxy);
router.get("/:id/thumbnail", mediaController.getThumbnail);
router.get("/:id/waveform", mediaController.getWaveform);
router.delete("/:id", mediaController.remove);

module.exports = router;
