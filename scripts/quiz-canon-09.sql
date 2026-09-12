INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('What are the five (5) key features of the EOS R5 Mark II? (select all that apply)', 'multi', ARRAY['Next generation autofocus via deep learning','Bigger battery than the EOS R5','45MP Back Illuminated Sensor','Pre-Continuous Shooting','8K 60P Video Recording','In-Camera Image Up-Scaling','Large vertical grip like Canon EOS R1']::text[], ARRAY[0,2,3,4,5]::integer[], 0)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R5 Mark II - 5 Key Selling Points (Sep-Nov)';