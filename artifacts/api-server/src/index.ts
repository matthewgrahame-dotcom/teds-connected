import path from "path";
import { fileURLToPath } from "url";

// Load the repo-root .env before anything else runs -- needed for local
// dev (Vercel sets real environment variables directly in its dashboard,
// so this is a harmless no-op there). Uses an explicit path rather than
// relying on cwd, since running this via
// `pnpm --filter @workspace/api-server run start` sets the working
// directory to this package's own folder, not the repo root where .env
// actually lives -- same reasoning as drizzle.config.ts's .env loading.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(__dirname, "../../../.env"));
} catch {
  // ignore -- real environment variables (e.g. on Vercel) take precedence
  // and don't need a .env file to exist at all
}

// Must be dynamic imports, AFTER loadEnvFile above -- static imports are
// hoisted and would evaluate ./app (and transitively @workspace/db, which
// throws immediately if DATABASE_URL is missing) before the .env load
// above ever got a chance to run, regardless of where it appears in the
// file.
const { default: app } = await import("./app");
const { logger } = await import("./lib/logger");

// One-time seed for AI Help's "quick action" templates (the buttons shown
// above the AI Help question box on the dashboard -- see
// AiHelpTemplatesDialog.tsx). These are plain rows in aiHelpTemplatesTable
// with no other source of truth (no fixture file, no migration data) --
// they only exist because someone inserted them via the admin UI (or, as
// here, via a startup seed). Keyed and deduped by label so this is safe to
// ship and run on every deploy/restart: existing installs that already
// have a given label are left untouched (including any edits an admin
// already made to it), and only genuinely missing ones get added. Runs
// after the app import above (so DATABASE_URL is already loaded) but
// before app.listen, and is non-fatal on failure -- a seeding problem
// shouldn't take the whole server down.
async function seedAiHelpTemplates() {
  const { db, aiHelpTemplatesTable } = await import("@workspace/db");
  const defaults = [
    {
      label: "Draft an onboarding checklist",
      prompt: "Create an onboarding checklist program for new ",
    },
    {
      label: "Write form instructions",
      prompt: "Write clear instructions for the ",
    },
    {
      label: "Add a photo to my last article",
      prompt: "Add a relevant photo to my most recent news article",
    },
  ];
  try {
    const existing = await db.select({ label: aiHelpTemplatesTable.label, sortOrder: aiHelpTemplatesTable.sortOrder }).from(aiHelpTemplatesTable);
    const existingLabels = new Set(existing.map((r) => r.label));
    let nextOrder = existing.length ? Math.max(...existing.map((r) => r.sortOrder)) + 1 : 0;
    const missing = defaults.filter((d) => !existingLabels.has(d.label));
    if (missing.length === 0) return;
    for (const d of missing) {
      await db.insert(aiHelpTemplatesTable).values({ label: d.label, prompt: d.prompt, sortOrder: nextOrder });
      nextOrder += 1;
    }
    logger.info({ added: missing.map((m) => m.label) }, "Seeded AI Help quick action templates");
  } catch (err) {
    logger.error({ err }, "Failed to seed AI Help templates (non-fatal)");
  }
}
await seedAiHelpTemplates();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
