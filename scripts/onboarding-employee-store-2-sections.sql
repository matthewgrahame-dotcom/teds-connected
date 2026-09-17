INSERT INTO onboarding_sections (program_id, title, sort_order) VALUES
  ((SELECT id FROM onboarding_programs WHERE title = 'New Employee - Store Onboarding'), 'Required forms to complete', 0),
  ((SELECT id FROM onboarding_programs WHERE title = 'New Employee - Store Onboarding'), 'Ted''s Cameras Code of Conduct', 1),
  ((SELECT id FROM onboarding_programs WHERE title = 'New Employee - Store Onboarding'), 'Required Reading', 2);
