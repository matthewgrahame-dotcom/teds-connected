INSERT INTO training_modules (program_id, title, module_type, content, external_url, sort_order)
SELECT program_id, 'M.A.T.C.H Price Match Training Video', 'lesson', '## The M.A.T.C.H Framework - Price Match Training
**Estimated total module time: 10-15 minutes**

Please note: videos may be paused, however progress is not saved and skipping is disabled. Each video must be watched in full in a single session before progression to the knowledge check modules is enabled.

Assessment questions are drawn directly from the video content, so it''s important to watch carefully. **100% competency must be achieved in order to complete this module.**

## Module Overview
Price match enquiries are a normal and valuable part of both our in-store and online customer interactions.

This module is designed to help you:
- Better understand why customers ask for price matches
- Approach these conversations with confidence
- Shift your mindset from pressure to opportunity
- Use a clear, consistent framework to guide the interaction

This training works alongside the M.A.T.C.H video, which introduces the overall mindset and conversation flow. Here, we focus on how to apply it.', 'https://www.youtube.com/watch?v=XcXnXhctuBI', sort_order - 1
FROM training_modules
WHERE title = 'M.A.T.C.H Price Match Training Module';