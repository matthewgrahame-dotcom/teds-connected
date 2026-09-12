UPDATE training_modules
SET content = content || '

Note: Feedback will only be shown to users after they complete the quiz.'
WHERE title = 'M.A.T.C.H Price Match Training Module';