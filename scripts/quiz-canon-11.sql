INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('In-camera upscaling, register people priority mode and 8K 60P recording are all new features on the R5 Mark II and did NOT exist with the previous R5', 'single' , ARRAY['True','False']::text[], ARRAY[0]::integer[], 0)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R5 Mark II - R5 vs R5 Mark II (Sep-Nov)';