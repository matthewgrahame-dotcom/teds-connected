import { defineConfig } from "drizzle-kit";
import path from "path";

// Load the repo-root .env explicitly using Node's built-in loader (available
// Node 20.12+/21.7+ -- this repo runs on Node 24, so no extra dependency is
// needed). drizzle-kit's CLI doesn't read any .env file on its own.
// __dirname is only used here, for the .env lookup -- NOT for the `schema`
// path below, since path.join()/__dirname produce Windows backslashes on
// this OS, and drizzle-kit resolves `schema` via a glob matcher that expects
// forward slashes; a backslash path causes a false "No schema files found"
// even though the file exists. Keeping `schema` below as a plain relative
// string (resolved against cwd when drizzle-kit runs) avoids that entirely.
try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch {
  // ignore
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});