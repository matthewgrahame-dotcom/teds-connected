INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('How many RAW files are taken during pre-shooting?', 'single' , ARRAY['5','10','20','14']::text[], ARRAY[2]::integer[], 0)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R1 with Wildlife Photographer - Jan Wegener - Pre shooting feature (Sep-Nov)';