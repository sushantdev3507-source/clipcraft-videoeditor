/**
 * ============================================================================
 * ISOLATED DEVELOPMENT/TEST AUTH -- TEMPORARY, NOT PRODUCTION ARCHITECTURE
 * ============================================================================
 * Member 1 owns real authentication (app/routes/auth.js). Media Management
 * still uses this separate dev-only token issuer for tests and local
 * development rather than real login, so uploads can be exercised without a
 * full register/login round trip.
 *
 * This file is deliberately kept small, isolated, and impossible to mistake
 * for real auth:
 *   - it signs with its own env var (DEV_AUTH_JWT_SECRET), never a
 *     production auth secret
 *   - it is only ever wired to the /api/v1/dev/* routes (see
 *     app/routes/dev.routes.js) and used by devAuthRequired below
 *   - it does not touch any specific table itself -- it only signs/verifies
 *     a `{ sub: userId }` JWT; dev.controller.js (login/createProject/etc.)
 *     is what decides which table that userId lives in
 *
 * Cutover note: dev.controller.js originally created its dev accounts/
 * projects in the temporary `dev_users` / `dev_projects` placeholder tables
 * (see app/db/migrations/001_dev_placeholder_auth.sql). Once Member 1's real
 * `users`/`projects` tables shipped and 004_uuid_ids.sql repointed
 * media_assets' foreign key at the real `projects` table, that placeholder
 * data no longer satisfied the FK, so dev.controller.js (and
 * ownership.service.js) were cut over to create/read real `users` /
 * `projects` rows instead -- see those files' own notes. The `dev_users` /
 * `dev_projects` tables themselves are now unused and can be dropped in a
 * future migration.
 *
 * DELETE THIS FILE (and app/routes/dev.routes.js) once Member 1's real auth
 * + projects are what the frontend actually integrates against. Do not
 * extend this into permanent media architecture.
 * ============================================================================
 */

const jwt = require("jsonwebtoken");

const DEV_AUTH_JWT_SECRET =
  process.env.DEV_AUTH_JWT_SECRET || "clipcraft-dev-only-insecure-secret";

if (!process.env.DEV_AUTH_JWT_SECRET) {
  // Loud on purpose: nobody should be surprised this isn't a real secret.
  console.warn(
    "[devAuth] DEV_AUTH_JWT_SECRET not set -- using an insecure development default. " +
      "This auth mechanism is temporary scaffolding and must never be used in production."
  );
}

function issueDevToken(devUserId) {
  return jwt.sign({ sub: devUserId }, DEV_AUTH_JWT_SECRET, { expiresIn: "7d" });
}

function devAuthRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "Missing or malformed Authorization header (expected: Bearer <dev token>)",
    });
  }

  try {
    const payload = jwt.verify(token, DEV_AUTH_JWT_SECRET);
    req.devUser = { userId: payload.sub };
    // Sprint 3: also expose the identity as `req.user`, the field name
    // Member 1's real auth middleware (authenticateToken) is expected to
    // set (see requireProjectAccess.js and the Sprint 3 flow diagram in
    // MEMBER2_SPRINT3.md). Same object, two names -- purely so new Sprint 3
    // code can be written once against `req.user.userId` and keep working
    // unchanged the moment this file is deleted in favor of the real thing.
    // (Standardized from `req.user.id` to `req.user.userId` to match
    // Member 1's real auth middleware, which decodes its JWT as
    // `{ userId, email }` and never sets `.id`.)
    req.user = req.devUser;
    next();
  } catch {
    return res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "Invalid or expired development token",
    });
  }
}

module.exports = { issueDevToken, devAuthRequired };
