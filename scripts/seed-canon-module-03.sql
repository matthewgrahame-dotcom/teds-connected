INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT id, 'Canon EOS R1 Pro Tech Talk - Alexandros Grymanis - FTP (Sep-Nov)', 'lesson', '## Module Introduction
Welcome to the Canon EOS R1 training module, Canon''s flagship full-frame mirrorless camera designed for professional photographers who demand exceptional speed, autofocus performance and reliability. This module will take you through the R1''s key features, technologies and real-world applications, with a focus on how to confidently translate its capabilities into meaningful customer benefits. **To be eligible for the Canon training competition prize pool, you must watch the full training video and complete the accompanying questionnaire.** Make sure you pay close attention throughout the video, as the questionnaire will test your understanding of the content covered.

## Questionnaire
## Q1. What is a crucial element in professional sports photography as described by Alexandros?
- Carefully editing the images after the final whistle
- Framing as many athletes as possible in your photo
- Lightning quick delivery of images to the client (correct)
## Q2. What is the Dual Threaded FTP connection on the EOS R1?
- Automatically edits and enhances your photos before sending them
- Allows you to print photos directly from the camera
- A transfer that allows users to upload 2 images at once to the server - making it twice as fast to deliver to the client in real time (correct)
## Q3. Why is pre-capture important for sport photographers like Atiba?
- The pre-captured frames are much sharper with higher megapixels
- Delivers more images for the client
- Helps to capture decisive moments in sharp focus they may have missed (correct)
## Q4. The EOS R1 allows for automatically switching between networks when you''re on the move
- True (correct)
- False', 'https://youtube.com/watch?v=U-67SIxwy5A&feature=youtu.be', 2
FROM training_programs
WHERE title = 'Canon Australia Training Modules (Sep-Nov 2026)'
ORDER BY id DESC LIMIT 1;