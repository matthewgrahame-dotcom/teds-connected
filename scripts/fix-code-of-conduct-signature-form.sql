UPDATE forms
SET
  instructions = '<p>I confirm that I have read and understand the Ted''s Camera Stores &ldquo;Code of Conduct&rdquo; and, as an employee of Ted''s Camera Stores, affirm my willingness to be bound by it.</p>',
  fields = '[{"key": "signed_by", "label": "Signed By", "type": "signature", "required": true}, {"key": "date", "label": "Date", "type": "date", "required": true}]'::jsonb
WHERE slug = 'code-of-conduct-signature';
