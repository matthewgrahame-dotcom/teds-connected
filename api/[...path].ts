// Vercel serverless entry point.
//
// The filename `[...path].ts` is Vercel's catch-all convention: every
// request under /api/* (e.g. /api/work-items, /api/healthz) is routed to
// this one function. The Express app itself already mounts all routes under
// "/api" (see artifacts/api-server/src/app.ts), and an Express app is a
// valid (req, res) request handler, so we can export it directly — no
// adapter package needed.
//
// This imports a pre-bundled plain-JS build (artifacts/api-server/dist/app.mjs,
// produced by `pnpm --filter @workspace/api-server run build`, run as part
// of the Vercel buildCommand — see vercel.json) rather than the TypeScript
// source directly. Vercel's own TypeScript compiler for serverless functions
// doesn't reliably follow this monorepo's shared tsconfig "extends" chain,
// which produced spurious module-resolution errors when this imported the
// .ts source directly. Importing an already-bundled, dependency-free .mjs
// file sidesteps that entirely — nothing left for Vercel's compiler to
// resolve or type-check beyond this one trivial re-export.
//
// Requires the Node.js serverless runtime (not Edge), since it uses `pg`
// for a real TCP connection to Postgres. Use a pooled connection string
// (e.g. Neon's "-pooler" host) for DATABASE_URL so connections behave well
// across cold starts.
// @ts-expect-error - pre-bundled plain JS output has no .d.ts, that's fine here
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
