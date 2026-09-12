INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R1 Pro Tech Talk - Alisha Lovrich - Speed (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R1 training module, Canon''s flagship full-frame mirrorless camera designed for professional photographers who demand exceptional speed, autofocus performance and reliability. This module will take you through the R1''s key features, technologies and real-world applications, with a focus on how to confidently translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the accompanying questionnaire.** Make sure you pay close attention throughout the video, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. What is continuous shooting?
- Function for a higher hit rate of in-focus images
- The amount of frames you capture in 1 second when holding down the shutter button (correct)
- Feature that allows faster readout speeds for reduced rolling shutter distortion
## Q2. At what Frames Per Second can the EOS R1 shoot at?
- 40fps (correct)
- 30 fps
- 45fps
- 24fps
## Q3. What are the benefits of high FPS in sports photography (such as Tennis)
- Creates more opportunities to capture the object (e.g. ball) and athlete where you want it - despite the action happening at speed (correct)
- Greater background blur and bokeh comes with high FPS
- With high FPS, the camera will automatically choose the best frame, so the photographer doesn''t have to make any decisions
## Q4. How does the R1 help sports photographers like Alisha avoid having egg-shaped tennis balls and wonky rackets in their photos?
- In camera upscaling
- Register People Priority
- Cross-type AF
- Reduced rolling shutter distortion (correct)', 'https://www.youtube.com/watch?v=PJf0hnW6YU8', 1
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;