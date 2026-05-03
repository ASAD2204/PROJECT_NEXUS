-- Add the LMS course program_id column to existing databases.

ALTER TABLE lms_courses
ADD COLUMN IF NOT EXISTS program_id INT;