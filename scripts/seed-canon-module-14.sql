INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R5 Mark II with TK North - Video features (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R5 Mark II training module, Canon''s high-performance full-frame hybrid camera designed for photographers and creators who demand exceptional resolution, speed, autofocus and video performance. This module will take you through the R5 Mark II''s key features, technologies and real-world applications, with a focus on how to translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the relevant short questionnaire.** Make sure you pay close attention throughout the module, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. What are the benefits of having C-log features in the R5 II?
- Higher dynamic range, which means more detail in both the dark and light areas of your video, and allows you to grade it into different output formats. (correct)
- Faster post-production process and smaller file sizes for video
- Automatically makes videos sharper without any editing
## Q2. What are some ergonomic updates TK highlighted that will benefit video users?
- Front record button
- Slight increase in weight and size on the R5II
- Full size HDMI output and front tally lamp (correct)', 'https://studio.youtube.com/video/YI93G-c6CeY', 13
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;