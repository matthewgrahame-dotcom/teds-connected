INSERT INTO key_contacts (user_id, sort_order)
SELECT pu.id, v.sort_order
FROM (VALUES
  ('alexm@teds.com.au', 1),
  ('rorym@teds.com.au', 2),
  ('jasonh@teds.com.au', 3),
  ('marka@teds.com.au', 4),
  ('daniely@teds.com.au', 5),
  ('silikab@teds.com.au', 6),
  ('andrewt@arnac.com.au', 7),
  ('web.manager@teds.com.au', 8),
  ('ering@teds.com.au', 9),
  ('advertising@teds.com.au', 10)
) AS v(username, sort_order)
JOIN portal_users pu ON pu.username = v.username;
