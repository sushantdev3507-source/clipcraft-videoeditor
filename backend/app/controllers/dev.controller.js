/**
 * Controllers backing the isolated dev-only auth/project routes.
 * See app/middleware/devAuth.js for why this exists and why it's temporary.
 *
 * Cutover note: this used to create/read the temporary `dev_users` /
 * `dev_projects` placeholder tables (see app/db/migrations/001_dev_placeholder_auth.sql).
 * Now that Member 1's real `users` and `projects` tables exist and
 * 004_uuid_ids.sql has repointed media_assets' fk_media_assets_project at
 * the real `projects` table, a project created against the old dev_projects
 * table can no longer satisfy that foreign key -- every media upload made
 * against a dev-created project failed with a DB-level FK violation. This
 * file now creates/reads real `users` / `projects` rows instead (via a
 * synthetic, uniquely-generated email for the dev "account"), so the
 * dev-only login/project flow still works end to end for testing without
 * needing full registration, while staying consistent with whichever table
 * the media FK actually points at. ownership.service.js was cut over the
 * same way -- see that file's own note.
 */

const crypto = require("crypto");
const pool = require("../config/db");
const { issueDevToken } = require("../middleware/devAuth");
const { checkProjectOwnership } = require("../services/ownership.service");
const { deleteAllMediaForProject } = require("../services/projectMediaCleanup.service");

async function login(req, res, next) {
  try {
    const { displayName, userId } = req.body || {};

    if (userId) {
      const result = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Unknown dev userId" });
      }
      return res.json({ userId, token: issueDevToken(userId) });
    }

    const newUserId = crypto.randomUUID();
    // Synthetic but unique -- users.email is UNIQUE NOT NULL, and this
    // account exists only to satisfy that constraint for dev/testing.
    const devEmail = `dev-${newUserId}@clipcraft.dev`;
    await pool.query(
      "INSERT INTO users (id, name, email, auth_provider) VALUES ($1, $2, $3, $4)",
      [newUserId, displayName || "Dev User", devEmail, "dev"]
    );

    return res.status(201).json({ userId: newUserId, token: issueDevToken(newUserId) });
  } catch (err) {
    next(err);
  }
}

async function createProject(req, res, next) {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "name is required" });
    }

    const projectId = crypto.randomUUID();
    await pool.query(
      "INSERT INTO projects (id, user_id, title) VALUES ($1, $2, $3)",
      [projectId, req.devUser.userId, name]
    );

    return res.status(201).json({ id: projectId, ownerId: req.devUser.userId, name });
  } catch (err) {
    next(err);
  }
}

async function listProjects(req, res, next) {
  try {
    const result = await pool.query(
      "SELECT id, title AS name, created_at FROM projects WHERE user_id = $1 ORDER BY created_at DESC",
      [req.devUser.userId]
    );
    return res.json({ projects: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * DEMONSTRATES the project-deletion media-cleanup contract Member 1's real
 * project deletion should follow (see app/services/projectMediaCleanup.service.js).
 * This dev-only project deletion stands in for Member 1's not-yet-built
 * real one purely so the contract is testable today; it is not meant to be
 * Member 2's implementation of project CRUD.
 */
async function deleteProject(req, res, next) {
  try {
    const { id: projectId } = req.params;

    const ownership = await checkProjectOwnership(projectId, req.devUser.userId);
    if (!ownership.exists) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Project not found" });
    }
    if (!ownership.isOwner) {
      return res.status(403).json({ error: "FORBIDDEN", message: "You do not have access to this project" });
    }

    // Contract: clean up media (files + rows) BEFORE deleting the project
    // row. See projectMediaCleanup.service.js for why the order matters.
    await deleteAllMediaForProject(projectId);
    await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { login, createProject, listProjects, deleteProject };
