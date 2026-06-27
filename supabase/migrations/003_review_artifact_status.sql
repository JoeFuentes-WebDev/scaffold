-- REVIEW artifacts use distinct status values from other artifact types.
UPDATE artifacts
SET status = 'template_generated'
WHERE artifact_type = 'review' AND status = 'generated';
