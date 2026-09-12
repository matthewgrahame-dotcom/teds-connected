INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('How did TK describe the placement of the updated on/off button - switching from left (R5) to right (R5 II)?', 'single' , ARRAY['Confusing for the users as it is a big change','Makes it much easier to use on the go, especially operating with just one hand','No noticeable change for better or worse']::text[], ARRAY[1]::integer[], 0),
  ('What does the new back-illuminated stacked CMOS sensor enable?', 'single' , ARRAY['Better battery life','Focus breathing control','Faster readout speeds and reduced rolling shutter distortion']::text[], ARRAY[2]::integer[], 1)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R5 Mark II with TK North - First impressions vs R5 (Sep-Nov)';