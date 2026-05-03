BEGIN;

-- ---------------------------------------------------------------------------
-- Seed core users
-- ---------------------------------------------------------------------------
INSERT INTO auth_users (email, password_hash, first_name, last_name, phone, is_active)
VALUES
  ('admin@nexus.edu', '$2b$12$eqX6aSdBQGzWsVWa24T1t.q95uBdG2nKlKwexIZg7kqWNMw1p6tce', 'System', 'Admin', '03000000001', TRUE),
  ('faculty@nexus.edu', '$2b$12$yXMlhSgrCs2NmUGBItGSyuyWqwI/tbgAjZx4zu/2/caRF6x94z6ti', 'Ali', 'Khan', '03000000002', TRUE),
  ('student@nexus.edu', '$2b$12$XGeuwXg0H8zV9TCng0Lfc.XjmH/ieuSyRWVYtr8/FpVMvup4cLx7a', 'Sara', 'Ahmed', '03000000003', TRUE),
  ('hod@nexus.edu', '$2b$12$fxW7Ja9MQjD58ggCpkoOEeRn4KABCRiKX7ANBpjcYxSAl.GpLlrMe', 'Hira', 'Malik', '03000000004', TRUE),
  ('librarian@nexus.edu', '$2b$12$TDDXoLxo5qhRzHxwIWA5WeJAkFka2j5cHq1Tb8f6OO5QDGiEjVuK2', 'Lia', 'Shah', '03000000005', TRUE),
  ('alumni@nexus.edu', '$2b$12$tIawljC/XDhlmJS74eiCM.beDVsBLiW0NB0T8lKRf6E/BQzG7lc3i', 'Adeel', 'Raza', '03000000006', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed role mappings (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO auth_user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM auth_users u
JOIN auth_roles r ON r.role_name = 'admin'
WHERE u.email = 'admin@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM auth_user_roles aur
    WHERE aur.user_id = u.user_id AND aur.role_id = r.role_id
  );

INSERT INTO auth_user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM auth_users u
JOIN auth_roles r ON r.role_name = 'faculty'
WHERE u.email = 'faculty@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM auth_user_roles aur
    WHERE aur.user_id = u.user_id AND aur.role_id = r.role_id
  );

INSERT INTO auth_user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM auth_users u
JOIN auth_roles r ON r.role_name = 'student'
WHERE u.email = 'student@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM auth_user_roles aur
    WHERE aur.user_id = u.user_id AND aur.role_id = r.role_id
  );

INSERT INTO auth_user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM auth_users u
JOIN auth_roles r ON r.role_name = 'hod'
WHERE u.email = 'hod@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM auth_user_roles aur
    WHERE aur.user_id = u.user_id AND aur.role_id = r.role_id
  );

INSERT INTO auth_user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM auth_users u
JOIN auth_roles r ON r.role_name = 'librarian'
WHERE u.email = 'librarian@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM auth_user_roles aur
    WHERE aur.user_id = u.user_id AND aur.role_id = r.role_id
  );

INSERT INTO auth_user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM auth_users u
JOIN auth_roles r ON r.role_name = 'alumni'
WHERE u.email = 'alumni@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM auth_user_roles aur
    WHERE aur.user_id = u.user_id AND aur.role_id = r.role_id
  );

-- ---------------------------------------------------------------------------
-- Seed SIS hierarchy
-- ---------------------------------------------------------------------------
INSERT INTO sis_departments (name, code, location)
VALUES ('Information Technology', 'IT', 'Main Campus')
ON CONFLICT (code) DO NOTHING;

INSERT INTO sis_programs (dept_id, title, degree_level, total_semesters)
SELECT d.dept_id, 'BS Information Technology', 'BS', 8
FROM sis_departments d
WHERE d.code = 'IT'
  AND NOT EXISTS (
    SELECT 1 FROM sis_programs p
    WHERE p.dept_id = d.dept_id AND p.title = 'BS Information Technology'
  );

INSERT INTO sis_semesters (title, start_date, end_date, is_active)
VALUES
  ('Spring 2026', DATE '2026-02-01', DATE '2026-06-15', TRUE),
  ('Fall 2026', DATE '2026-08-20', DATE '2026-12-20', FALSE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed faculty and student profiles
-- ---------------------------------------------------------------------------
INSERT INTO sis_faculty (user_id, dept_id, employee_code, designation, phone)
SELECT u.user_id, d.dept_id, 'FAC-1001', 'Lecturer', '03000000002'
FROM auth_users u
JOIN sis_departments d ON d.code = 'IT'
WHERE u.email = 'faculty@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM sis_faculty f WHERE f.employee_code = 'FAC-1001'
  );

INSERT INTO sis_students (user_id, program_id, roll_no, cnic, current_semester, current_risk_status)
SELECT u.user_id, p.program_id, 'BIT-2026-001', '35202-1234567-1', 2, 'Green'
FROM auth_users u
JOIN sis_programs p ON p.title = 'BS Information Technology'
WHERE u.email = 'student@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM sis_students s WHERE s.roll_no = 'BIT-2026-001'
  );

INSERT INTO sis_students (user_id, program_id, roll_no, cnic, dob, address, phone, current_semester, current_risk_status)
SELECT u.user_id, p.program_id, 'BIT-2021-ALM1', '35202-7654321-9', DATE '1999-05-15', 'Alumni City', '03000000006', 8, 'Green'
FROM auth_users u
JOIN sis_programs p ON p.title = 'BS Information Technology'
WHERE u.email = 'alumni@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM sis_students s WHERE s.user_id = u.user_id
  );

INSERT INTO alumni_registry (
  student_id,
  grad_year,
  degree,
  current_employer,
  current_position,
  location,
  photo_url,
  linkedin_url,
  achievements,
  expertise
)
SELECT
  s.student_id,
  2024,
  'BS Information Technology',
  'Nexus Labs',
  'Software Engineer',
  'Karachi',
  NULL,
  'https://www.linkedin.com/in/adeelraza',
  '["Capstone Excellence", "Open Source Contributor"]',
  '["React", "FastAPI", "Docker"]'
FROM auth_users u
JOIN sis_students s ON s.user_id = u.user_id
WHERE u.email = 'alumni@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM alumni_registry ar WHERE ar.student_id = s.student_id
  );

INSERT INTO alumni_jobs (
  alumni_id,
  title,
  company,
  description,
  apply_link,
  location,
  job_type,
  posted_at,
  is_active,
  status
)
SELECT
  ar.alumni_id,
  'Senior Software Engineer',
  'Nexus Labs',
  'Build and ship campus tools used by thousands of students.',
  'https://example.com/apply/senior-software-engineer',
  'Karachi',
  'Full-time',
  CURRENT_TIMESTAMP,
  TRUE,
  'Approved'
FROM auth_users u
JOIN sis_students s ON s.user_id = u.user_id
JOIN alumni_registry ar ON ar.student_id = s.student_id
WHERE u.email = 'alumni@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM alumni_jobs j
    WHERE j.alumni_id = ar.alumni_id
      AND j.title = 'Senior Software Engineer'
      AND j.company = 'Nexus Labs'
  );

INSERT INTO alumni_success_stories (
  alumni_id,
  title,
  content,
  cover_image,
  likes_count,
  is_featured,
  status,
  published_at,
  created_at
)
SELECT
  ar.alumni_id,
  'From Campus Project to Production Platform',
  'Started with a class project and turned it into a production platform serving an entire campus.',
  NULL,
  12,
  TRUE,
  'Approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM auth_users u
JOIN sis_students s ON s.user_id = u.user_id
JOIN alumni_registry ar ON ar.student_id = s.student_id
WHERE u.email = 'alumni@nexus.edu'
  AND NOT EXISTS (
    SELECT 1 FROM alumni_success_stories st
    WHERE st.alumni_id = ar.alumni_id
      AND st.title = 'From Campus Project to Production Platform'
  );

-- ---------------------------------------------------------------------------
-- Seed LMS basics
-- ---------------------------------------------------------------------------
INSERT INTO lms_courses (dept_id, code, title, description, credit_hours)
SELECT d.dept_id, 'IT201', 'Database Systems', 'Core database course', 3
FROM sis_departments d
WHERE d.code = 'IT'
  AND NOT EXISTS (
    SELECT 1 FROM lms_courses c WHERE c.code = 'IT201'
  );

INSERT INTO lms_sections (course_id, semester_id, faculty_id, room_no, capacity)
SELECT c.course_id, s.semester_id, f.faculty_id, 'A-101', 40
FROM lms_courses c
JOIN sis_semesters s ON s.title = 'Spring 2026'
JOIN sis_faculty f ON f.employee_code = 'FAC-1001'
WHERE c.code = 'IT201'
  AND NOT EXISTS (
    SELECT 1 FROM lms_sections ls
    WHERE ls.course_id = c.course_id AND ls.semester_id = s.semester_id AND ls.faculty_id = f.faculty_id
  );

INSERT INTO sis_enrollments (student_id, section_id, status)
SELECT st.student_id, sec.section_id, 'Enrolled'
FROM sis_students st
JOIN lms_sections sec ON sec.room_no = 'A-101'
WHERE st.roll_no = 'BIT-2026-001'
  AND NOT EXISTS (
    SELECT 1 FROM sis_enrollments e
    WHERE e.student_id = st.student_id AND e.section_id = sec.section_id
  );

-- ---------------------------------------------------------------------------
-- Seed finance records
-- ---------------------------------------------------------------------------
INSERT INTO fin_fee_heads (title, default_amount)
VALUES
  ('Tuition Fee', 50000.00),
  ('Lab Fee', 5000.00)
ON CONFLICT DO NOTHING;

INSERT INTO fin_invoices (student_id, semester_id, total_amount, due_date, status)
SELECT st.student_id, sem.semester_id, 55000.00, DATE '2026-05-15', 'Unpaid'
FROM sis_students st
JOIN sis_semesters sem ON sem.title = 'Spring 2026'
WHERE st.roll_no = 'BIT-2026-001'
  AND NOT EXISTS (
    SELECT 1 FROM fin_invoices i
    WHERE i.student_id = st.student_id AND i.semester_id = sem.semester_id
  );

COMMIT;
