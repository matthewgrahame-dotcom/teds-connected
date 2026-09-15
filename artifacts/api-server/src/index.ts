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
