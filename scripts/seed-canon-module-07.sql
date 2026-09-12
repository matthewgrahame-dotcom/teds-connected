INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R1 with Wildlife Photographer - Jan Wegener - R1 vs R5II (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R1 training module, Canon''s flagship full-frame mirrorless camera designed for professional photographers who demand exceptional speed, autofocus performance and reliability. This module will take you through the R1''s key features, technologies and real-world applications, with a focus on how to confidently translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the accompanying questionnaire.** Make sure you pay close attention throughout the video, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. The R1 is the best camera Jan has ever used (at the time of the video - November 2024)
- True (correct)
- False
## Q2. Who does Jan recommend the EOS R1 to?
- Users who shoot in tough conditions and push their cameras to the limit (correct)
- Users who vlog for extended hours
- Users who film creative scenes and require portability', 'https://youtube.com/watch?v=nbxWEoU4Ask&feature=youtu.be', 6
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;