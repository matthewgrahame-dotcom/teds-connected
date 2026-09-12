INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('What does the register people priority mode allow?', 'single' , ARRAY['Cinema EOS level options such as Custom Picture, Canon Log 2, Canon Log 3 and proxy recording','Allows users to register their customized camera settings individually','Camera to detect faces you input and prioritise focusing on them']::text[], ARRAY[2]::integer[], 0),
  ('How many frames per second does the R5 Mark II give you when using the electronic shutter?', 'single' , ARRAY['20 fps','30 fps','25 fps']::text[], ARRAY[1]::integer[], 1)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R5 Mark II with TK North - Autofocus & pre-shooting (Sep-Nov)';