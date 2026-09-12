INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R5 Mark II - Introduction (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R5 Mark II training module, Canon''s high-performance full-frame hybrid camera designed for photographers and creators who demand exceptional resolution, speed, autofocus and video performance. This module will take you through the R5 Mark II''s key features, technologies and real-world applications, with a focus on how to translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the relevant short questionnaire.** Make sure you pay close attention throughout the module, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. How would you best describe the positioning of the R5 Mark II within the R Series?
- Aspirational, Brand Defining, Accessible (correct)
- Refined, Luxury, Niche
- Beginner, Lightweight, Basic', 'https://youtube.com/watch?v=O3ld_ZAcMAY&feature=youtu.be', 7
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;