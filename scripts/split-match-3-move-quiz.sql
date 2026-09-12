UPDATE training_modules
SET program_id = (SELECT id FROM training_programs WHERE title = 'M.A.T.C.H Price Match Training Module' ORDER BY id DESC LIMIT 1),
    sort_order = 1
WHERE title = 'M.A.T.C.H Price Match Training Module'
  AND program_id != (SELECT id FROM training_programs WHERE title = 'M.A.T.C.H Price Match Training Module' ORDER BY id DESC LIMIT 1);