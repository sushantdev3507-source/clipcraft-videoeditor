/**
 * Project-ownership check used to gate media upload/access/delete.
 *
 * Cutover: this originally talked to the temporary `dev_projects`
 * placeholder table (see app/db/migrations/001_dev_placeholder_auth.sql),
 * exactly as this comment used to say it would need to change once Member 1
 * shipped real projects. That has now happened -- 004_uuid_ids.sql also
 * repointed media_assets' fk_media_assets_project foreign key at the real
 * `projects` table -- so this now queries `projects` directly. Callers
 * (upload parser, media controller, dev.controller.js) only ever see the
 * {exists, isOwner} shape below, never the underlying table name, so no
 * other file needed to change for this cutover.
 */

const pool = require("../config/db");

/**
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<{ exists: boolean, isOwner: boolean }>}
 */
async function checkProjectOwnership(projectId, userId) {
  const result = await pool.query(
    "SELECT user_id AS owner_id FROM projects WHERE id = $1",
    [projectId]
  );

  if (result.rows.length === 0) {
    return { exists: false, isOwner: false };
  }

  return { exists: true, isOwner: result.rows[0].owner_id === userId };
}

module.exports = { checkProjectOwnership };
