INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R5 Mark II - Recommended Lenses (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R5 Mark II training module, Canon''s high-performance full-frame hybrid camera designed for photographers and creators who demand exceptional resolution, speed, autofocus and video performance. This module will take you through the R5 Mark II''s key features, technologies and real-world applications, with a focus on how to translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the relevant short questionnaire.** Make sure you pay close attention throughout the module, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. Which sports are identified by Action Priority on the R5 Mark II?
- Soccer, Basketball, Volleyball (correct)
- Rugby, Golf, Hockey
- AFL, Cricket, Handball
## Q2. Which lenses are recommended with R5 Mark II? (select all that apply)
- RF 15-35mm f/2.8L IS USM (correct)
- RF 24-70mm f/2.8L IS USM (correct)
- RF 70-200mm f/2.8L IS USM (correct)', 'https://www.youtube.com/watch?v=hx9GL67rV_M', 9
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;