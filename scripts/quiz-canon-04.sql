INSERT INTO training_quiz_questions (module_id, question_text, question_type, options, correct_option_indices, sort_order)
SELECT tm.id, v.question_text, v.question_type, v.options, v.correct_option_indices, v.sort_order
FROM (VALUES
  ('The EOS R1 has the same battery as the:', 'single' , ARRAY['EOS R3 & 1DX III','EOS R5 II','EOS R50','EOS R8']::text[], ARRAY[0]::integer[], 0),
  ('Jan preferred the electrical view finder (EVF) on the R1 over all the other EVF''s he''s used before. Why was that?', 'single' , ARRAY['Efficiency with battery life','Larger size & improved rubber piece','Higher sensitivity to the eye']::text[], ARRAY[1]::integer[], 1),
  ('How did Jan describe his experience shooting with the EOS R1 out in the wild?', 'single' , ARRAY['"The most portable camera on the market"','"The best for videos"','"The most stable camera i''ve ever had"']::text[], ARRAY[2]::integer[], 2),
  ('How did the R1 footage compare to other cameras Jan had used in windy conditions?', 'single' , ARRAY['Noticeable camera shake','Much more stable with dramatically less shake','Best in colour']::text[], ARRAY[1]::integer[], 3),
  ('How does the R1 autofocus compare to the R5II?', 'single' , ARRAY['Same level of speed and accuracy','Less precise','Much more decisive and stickier (to the subject)']::text[], ARRAY[2]::integer[], 4)
) AS v(question_text, question_type, options, correct_option_indices, sort_order)
JOIN training_modules tm ON tm.title = 'Canon EOS R1 with Wildlife Photographer - Jan Wegener - R1 In Hand (Sep-Nov)';