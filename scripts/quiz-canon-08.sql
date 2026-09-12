INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('How would you best describe the positioning of the R5 Mark II within the R Series?', 'single' , ARRAY['Aspirational, Brand Defining, Accessible','Refined, Luxury, Niche','Beginner, Lightweight, Basic']::text[], ARRAY[0]::integer[], 0)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R5 Mark II - Introduction (Sep-Nov)';