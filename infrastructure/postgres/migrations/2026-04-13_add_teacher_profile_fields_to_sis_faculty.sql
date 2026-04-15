-- Add persisted teacher profile fields to sis_faculty for existing databases.

ALTER TABLE sis_faculty
ADD COLUMN IF NOT EXISTS specialization VARCHAR(100),
ADD COLUMN IF NOT EXISTS office_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(30),
ADD COLUMN IF NOT EXISTS joining_date DATE,
ADD COLUMN IF NOT EXISTS qualification VARCHAR(150),
ADD COLUMN IF NOT EXISTS experience VARCHAR(100),
ADD COLUMN IF NOT EXISTS research_interests TEXT,
ADD COLUMN IF NOT EXISTS publications TEXT,
ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS office_hours VARCHAR(100);
