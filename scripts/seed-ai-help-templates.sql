-- One-off seed for new "AI Help" quick-action templates.
-- Run this directly in Neon's SQL console (see artifacts/api-server/src/index.ts
-- for why this can't run as an app-startup seed on Vercel's serverless setup).
--
-- Dedupe-safe by label: only inserts a row if no existing template already
-- has that exact label, so this is safe to paste and run more than once,
-- and won't touch the three templates already there
-- ("Create news item", "Create calendar entry", "Create new form").
--
-- sort_order values are set high (100+) so these three append after
-- whatever's already there, rather than needing to compute the current
-- max first.

INSERT INTO ai_help_templates (label, prompt, sort_order)
SELECT v.label, v.prompt, v.sort_order
FROM (VALUES
  ('Draft an onboarding checklist', 'Create an onboarding checklist program for new ', 100),
  ('Write form instructions', 'Write clear instructions for the ', 101),
  ('Add a photo to my last article', 'Add a relevant photo to my most recent news article', 102)
) AS v(label, prompt, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM ai_help_templates t WHERE t.label = v.label
);
