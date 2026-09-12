INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('Which sports are identified by Action Priority on the R5 Mark II?', 'single' , ARRAY['Soccer, Basketball, Volleyball','Rugby, Golf, Hockey','AFL, Cricket, Handball']::text[], ARRAY[0]::integer[], 0),
  ('Which lenses are recommended with R5 Mark II? (select all that apply)', 'multi', ARRAY['RF 15-35mm f/2.8L IS USM','RF 24-70mm f/2.8L IS USM','RF 70-200mm f/2.8L IS USM']::text[], ARRAY[0,1,2]::integer[], 1)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R5 Mark II - Recommended Lenses (Sep-Nov)';