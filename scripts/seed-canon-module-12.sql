INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R5 Mark II with TK North - First impressions vs R5 (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R5 Mark II training module, Canon''s high-performance full-frame hybrid camera designed for photographers and creators who demand exceptional resolution, speed, autofocus and video performance. This module will take you through the R5 Mark II''s key features, technologies and real-world applications, with a focus on how to translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the relevant short questionnaire.** Make sure you pay close attention throughout the module, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. How did TK describe the placement of the updated on/off button - switching from left (R5) to right (R5 II)?
- Confusing for the users as it is a big change
- Makes it much easier to use on the go, especially operating with just one hand (correct)
- No noticeable change for better or worse
## Q2. What does the new back-illuminated stacked CMOS sensor enable?
- Better battery life
- Focus breathing control
- Faster readout speeds and reduced rolling shutter distortion (correct)', 'https://youtube.com/watch?v=vX2CWo8ltsY&feature=youtu.be', 11
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;