INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('The R1 is the best camera Jan has ever used (at the time of the video - November 2024)', 'single' , ARRAY['True','False']::text[], ARRAY[0]::integer[], 0),
  ('Who does Jan recommend the EOS R1 to?', 'single' , ARRAY['Users who shoot in tough conditions and push their cameras to the limit','Users who vlog for extended hours','Users who film creative scenes and require portability']::text[], ARRAY[0]::integer[], 1)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R1 with Wildlife Photographer - Jan Wegener - R1 vs R5II (Sep-Nov)';