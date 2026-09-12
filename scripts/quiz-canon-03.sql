INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('What is a crucial element in professional sports photography as described by Alexandros?', 'single' , ARRAY['Carefully editing the images after the final whistle','Framing as many athletes as possible in your photo','Lightning quick delivery of images to the client']::text[], ARRAY[2]::integer[], 0),
  ('What is the Dual Threaded FTP connection on the EOS R1?', 'single' , ARRAY['Automatically edits and enhances your photos before sending them','Allows you to print photos directly from the camera','A transfer that allows users to upload 2 images at once to the server - making it twice as fast to deliver to the client in real time']::text[], ARRAY[2]::integer[], 1),
  ('Why is pre-capture important for sport photographers like Atiba?', 'single' , ARRAY['The pre-captured frames are much sharper with higher megapixels','Delivers more images for the client','Helps to capture decisive moments in sharp focus they may have missed']::text[], ARRAY[2]::integer[], 2),
  ('The EOS R1 allows for automatically switching between networks when you''re on the move', 'single' , ARRAY['True','False']::text[], ARRAY[0]::integer[], 3)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R1 Pro Tech Talk - Alexandros Grymanis - FTP (Sep-Nov)';