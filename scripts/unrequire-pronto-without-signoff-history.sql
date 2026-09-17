UPDATE work_document_role_access
SET required_reading = false
WHERE document_id IN (
  SELECT id FROM work_documents
  WHERE title IN ('Processing Zip Money Payments', 'iPad Click & Collect - Customer Handover SOP')
)
AND required_reading = true;
