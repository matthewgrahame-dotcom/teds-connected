INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R1 with Wildlife Photographer - Jan Wegener - R1 In Hand (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R1 training module, Canon''s flagship full-frame mirrorless camera designed for professional photographers who demand exceptional speed, autofocus performance and reliability. This module will take you through the R1''s key features, technologies and real-world applications, with a focus on how to confidently translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the accompanying questionnaire.** Make sure you pay close attention throughout the video, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. The EOS R1 has the same battery as the:
- EOS R3 & 1DX III (correct)
- EOS R5 II
- EOS R50
- EOS R8
## Q2. Jan preferred the electrical view finder (EVF) on the R1 over all the other EVF''s he''s used before. Why was that?
- Efficiency with battery life
- Larger size & improved rubber piece (correct)
- Higher sensitivity to the eye
## Q3. How did Jan describe his experience shooting with the EOS R1 out in the wild?
- "The most portable camera on the market"
- "The best for videos"
- "The most stable camera i''ve ever had" (correct)
## Q4. How did the R1 footage compare to other cameras Jan had used in windy conditions?
- Noticeable camera shake
- Much more stable with dramatically less shake (correct)
- Best in colour
## Q5. How does the R1 autofocus compare to the R5II?
- Same level of speed and accuracy
- Less precise
- Much more decisive and stickier (to the subject) (correct)', 'https://youtube.com/watch?v=ACQWiiDcdtw&feature=youtu.be', 3
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;