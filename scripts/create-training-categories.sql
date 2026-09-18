-- Run this once in Neon.
-- Adds the training_categories registry table (name -> color -> sort order)
-- used by Learn > Programs' color-coded folder grouping. Does NOT touch
-- training_programs.category, which stays free text.

CREATE TABLE training_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'bg-accent',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed from whatever categories already exist on real programs, so this
-- isn't an empty list on first load. Each distinct existing category gets
-- a different color, cycling through a small fixed palette in the order
-- the category first appeared (by the lowest program id using it).
WITH distinct_categories AS (
  SELECT category, MIN(id) AS first_id
  FROM training_programs
  WHERE category IS NOT NULL AND category <> ''
  GROUP BY category
),
ordered AS (
  SELECT category, ROW_NUMBER() OVER (ORDER BY first_id) - 1 AS rn
  FROM distinct_categories
),
palette (idx, color) AS (
  VALUES
    (0, 'bg-accent'),
    (1, 'bg-emerald-500'),
    (2, 'bg-destructive'),
    (3, 'bg-primary'),
    (4, 'bg-purple-500'),
    (5, 'bg-orange-500'),
    (6, 'bg-pink-500'),
    (7, 'bg-cyan-500')
)
INSERT INTO training_categories (name, color, sort_order)
SELECT o.category, p.color, o.rn
FROM ordered o
JOIN palette p ON p.idx = o.rn % 8;
