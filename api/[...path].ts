// Vercel serverless entry point.
//
// The filename `[...path].ts` is Vercel's catch-all convention: every
// request under /api/* (e.g. /api/work-items, /api/healthz) is routed to
// this one function. The Express app itself already mounts all routes under
// "/api" (see artifacts/api-server/src/app.ts), and an Express app is a
// valid (req, res) request handler, so we can export it directly — no
// adapter package needed.
//
// Requires the Node.js serverless runtime (not Edge), since it uses `pg`
// for a real TCP connection to Postgres. Use a pooled connection string
// (e.g. Neon's "-pooler" host) for DATABASE_URL so connections behave well
// across cold starts.
import app from "../artifacts/api-server/src/app";

export default app;
