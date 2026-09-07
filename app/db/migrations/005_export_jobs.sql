-- 005_export_jobs.sql
--
-- Backs the export/render pipeline (POST /api/v1/export and friends,
-- app/workers/renders.workers.js). This table was referenced by
-- app/controllers/export.controller.js and app/workers/renders.workers.js
-- from the very start of this repo's history, but nothing ever created it
-- -- every one of those endpoints has been 500ing (and the worker logging
-- "QUEUE LOAD ERROR: relation \"export_jobs\" does not exist" on every
-- boot) since the export feature was first scaffolded.
--
-- Unlike the old export.controller.js, jobs here are keyed by project_id +
-- user_id (real ownership, matching every other table in this schema)
-- rather than raw client-supplied input/output filesystem paths -- the
-- render step resolves its actual input file itself, server-side, via
-- app/services/mediaResolver.service.js, from the project's own
-- timeline_json + media_assets, the same integration seam that module was
-- always meant to be used through.
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  format TEXT NOT NULL DEFAULT 'mp4' CHECK (format IN ('mp4')),
  quality TEXT NOT NULL DEFAULT '1080p' CHECK (quality IN ('720p', '1080p')),

  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Storage key (relative to MEDIA_STORAGE_ROOT, see storage.service.js),
  -- never an absolute filesystem path -- set once rendering completes.
  output_storage_key TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_project_id ON export_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
