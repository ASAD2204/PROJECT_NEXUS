BEGIN;

-- ---------------------------------------------------------------------------
-- Seed core users
-- ---------------------------------------------------------------------------
INSERT INTO auth_users (email, password_hash, first_name, last_name, phone, is_active)
VALUES
  ('admin@nexus.local', '$2b$12$dev.seed.hash.admin', 'System', 'Admin', '03000000001', TRUE),
  ('faculty@nexus.local', '$2b$12$dev.seed.hash.faculty', 'Ali', 'Khan', '03000000002', TRUE),
  ('student@nexus.local', '$2b$12$dev.seed.hash.student', 'Sara', 'Ahmed', '03000000003', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed role mappings (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO auth_user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM auth_users u
JOIN auth_roles r ON r.role_name = 'admin'
WHERE u.email = 'admin@nexus.local'
  AND NOT EXISTS (
    SELECT 1 FROM auth_user_roles aur
    WHERE aur.user_id = u.user_id AND aur.role_id = r.role_id
  );

INSERT INTO auth_user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM auth_users u
JOIN auth_roles r ON r.role_name = 'faculty'
WHERE u.email = 'faculty@nexus.local'
  AND NOT EXISTS (
    SELECT 1 FROM auth_user_roles aur
    WHERE aur.user_id = u.user_id AND aur.role_id = r.role_id
  );

INSERT INTO auth_user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM auth_users u
JOIN auth_roles r ON r.role_name = 'student'
WHERE u.email = 'student@nexus.local'
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
WHERE u.email = 'faculty@nexus.local'
  AND NOT EXISTS (
    SELECT 1 FROM sis_faculty f WHERE f.employee_code = 'FAC-1001'
  );

INSERT INTO sis_students (user_id, program_id, roll_no, cnic, current_semester, current_risk_status)
SELECT u.user_id, p.program_id, 'BIT-2026-001', '35202-1234567-1', 2, 'Green'
FROM auth_users u
JOIN sis_programs p ON p.title = 'BS Information Technology'
WHERE u.email = 'student@nexus.local'
  AND NOT EXISTS (
    SELECT 1 FROM sis_students s WHERE s.roll_no = 'BIT-2026-001'
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
