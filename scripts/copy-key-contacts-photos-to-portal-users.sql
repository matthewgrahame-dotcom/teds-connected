UPDATE portal_users pu
SET photo_url = kc.photo_url
FROM key_contacts kc
WHERE kc.user_id = pu.id
  AND kc.photo_url IS NOT NULL
  AND pu.photo_url IS NULL;
