// Replaces an inline `sh -c '...'` preinstall script that only ever worked
// on Unix-like shells (bash/sh) -- it silently failed on native Windows
// CMD/PowerShell, where `sh` isn't available at all, blocking every pnpm
// command project-wide. Plain Node is guaranteed available (it's what's
// running the package manager), so this does the same two things --
// clean up any stray npm/yarn lockfiles, and refuse to proceed if
// something other than pnpm is being used -- in a way that works
// identically on every OS.
import { existsSync, rmSync } from "node:fs";

for (const file of ["package-lock.json", "yarn.lock"]) {
  if (existsSync(file)) rmSync(file, { force: true });
}

const userAgent = process.env.npm_config_user_agent ?? "";
if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
