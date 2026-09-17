INSERT INTO forms (title, slug, instructions, fields, status, is_public, grouped_fields)
VALUES (
  'Code of Conduct Signature',
  'code-of-conduct-signature',
  '<p>I confirm that I have read and understand the Ted''s Camera Stores &ldquo;Code of Conduct&rdquo; and, as an employee of Ted''s Camera Stores, affirm my willingness to be bound by it.</p>',
  '[{"key": "signed_by", "label": "Signed By", "type": "signature", "required": true}, {"key": "date", "label": "Date", "type": "date", "required": true}]'::jsonb,
  'live',
  false,
  false
);
