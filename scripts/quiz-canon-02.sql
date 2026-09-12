INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('What is continuous shooting?', 'single' , ARRAY['Function for a higher hit rate of in-focus images','The amount of frames you capture in 1 second when holding down the shutter button','Feature that allows faster readout speeds for reduced rolling shutter distortion']::text[], ARRAY[1]::integer[], 0),
  ('At what Frames Per Second can the EOS R1 shoot at?', 'single' , ARRAY['40fps','30 fps','45fps','24fps']::text[], ARRAY[0]::integer[], 1),
  ('What are the benefits of high FPS in sports photography (such as Tennis)', 'single' , ARRAY['Creates more opportunities to capture the object (e.g. ball) and athlete where you want it - despite the action happening at speed','Greater background blur and bokeh comes with high FPS','With high FPS, the camera will automatically choose the best frame, so the photographer doesn''t have to make any decisions']::text[], ARRAY[0]::integer[], 2),
  ('How does the R1 help sports photographers like Alisha avoid having egg-shaped tennis balls and wonky rackets in their photos?', 'single' , ARRAY['In camera upscaling','Register People Priority','Cross-type AF','Reduced rolling shutter distortion']::text[], ARRAY[3]::integer[], 3)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R1 Pro Tech Talk - Alisha Lovrich - Speed (Sep-Nov)';