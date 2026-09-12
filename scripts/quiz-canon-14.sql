INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('What are the benefits of having C-log features in the R5 II?', 'single' , ARRAY['Higher dynamic range, which means more detail in both the dark and light areas of your video, and allows you to grade it into different output formats.','Faster post-production process and smaller file sizes for video','Automatically makes videos sharper without any editing']::text[], ARRAY[0]::integer[], 0),
  ('What are some ergonomic updates TK highlighted that will benefit video users?', 'single' , ARRAY['Front record button','Slight increase in weight and size on the R5II','Full size HDMI output and front tally lamp']::text[], ARRAY[2]::integer[], 1)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R5 Mark II with TK North - Video features (Sep-Nov)';