INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R1 with Wildlife Photographer - Jan Wegener - Pre shooting feature (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R1 training module, Canon''s flagship full-frame mirrorless camera designed for professional photographers who demand exceptional speed, autofocus performance and reliability. This module will take you through the R1''s key features, technologies and real-world applications, with a focus on how to confidently translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the accompanying questionnaire.** Make sure you pay close attention throughout the video, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. How many RAW files are taken during pre-shooting?
- 5
- 10
- 20 (correct)
- 14', 'https://www.youtube.com/watch?v=pSHrlR4LEtw&feature=youtu.be', 5
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;