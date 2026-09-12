INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R1 Pro Tech Talk - Atiba Jefferson - AF (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R1 training module, Canon''s flagship full-frame mirrorless camera designed for professional photographers who demand exceptional speed, autofocus performance and reliability. This module will take you through the R1''s key features, technologies and real-world applications, with a focus on how to confidently translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the accompanying questionnaire.** Make sure you pay close attention throughout the video, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. What does Action Priority AF enable?
- Enables the camera to determine the main subject in basketball, soccer and volleyball (correct)
- Register people within the camera for detection
- Pre-continuous shooting of 20 frames before the shutter is fully pressed
## Q2. Which feature allows sports photographers to single out specific players on the team for the camera to focus on?
- Register People Priority (correct)
- In camera upscaling
- Blackout-free EVF
- Pre-shooting
## Q3. Why is pre-capture important for sports photographers like Atiba?
- The pre-capture images are more stable with reduced shake
- Allows users to capture the decisive moment in sharp focus even before they''ve pressed the button (correct)
- Greater detail is captured in the pre-capture files
## Q4. Cross type AF supports with
- Uses a single focus point and surrounding points to track a moving subject
- Increasing accuracy especially in situations where subjects have many horizontal lines, small sizes or when the subject is low contrast (correct)
- Locking focus on a subject and ignore anything that comes between the camera and the subject', 'https://youtube.com/watch?v=vWFnrywRTkI&feature=youtu.be', 0
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;