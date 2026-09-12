INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('Who would benefit most upgrading to the R5 Mark II?', 'single' , ARRAY['Live streamers','Landscape photographers','Action shooters capturing fast movement and action','Portrait photographers']::text[], ARRAY[2]::integer[], 0),
  ('Which of the below 5 series cameras does TK currently choose for video shooting?', 'single' , ARRAY['EOS R1','EOS R5 Mark II','EOS R5C','EOS R5']::text[], ARRAY[1]::integer[], 1)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R5 Mark II with TK North - Who should purchase the R5 Mark II (Sep-Nov)';