-- ==========================================================
-- PROJECT NEXUS - FINAL DATABASE SCHEMA (v2.0)
-- Polyglot Architecture: PostgreSQL Node
-- ==========================================================

-- 1. Enable UUID Extension (Crucial for User IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- MODULE 1: AUTHENTICATION & SECURITY
-- ==========================================================

-- 1. Central Identity Table
CREATE TABLE auth_users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- 2. System Roles
CREATE TABLE auth_roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'student', 'faculty', 'admin', 'hod'
    description TEXT
);

-- 3. User-Role Mapping (Many-to-Many)
CREATE TABLE auth_user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    role_id INT REFERENCES auth_roles(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Granular Permissions
CREATE TABLE auth_permissions (
    perm_id SERIAL PRIMARY KEY,
    role_id INT REFERENCES auth_roles(role_id) ON DELETE CASCADE,
    resource VARCHAR(50), -- e.g., 'grade_book'
    action_slug VARCHAR(50), -- e.g., 'edit', 'view'
    UNIQUE(role_id, resource, action_slug)
);

-- 5. API Keys for External Integrations
CREATE TABLE auth_api_keys (
    key_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    service_name VARCHAR(100), -- e.g., 'Library Kiosk'
    api_key_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP
);

-- ==========================================================
-- MODULE 2: STUDENT INFORMATION SYSTEM (SIS) - Core
-- ==========================================================

-- 6. Departments
CREATE TABLE sis_departments (
    dept_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE, -- e.g., 'CS', 'IT'
    location VARCHAR(100)
);

-- 7. Programs
CREATE TABLE sis_programs (
    program_id SERIAL PRIMARY KEY,
    dept_id INT REFERENCES sis_departments(dept_id),
    title VARCHAR(100), -- e.g., 'BS Information Technology'
    degree_level VARCHAR(20), -- 'BS', 'MS'
    total_semesters INT
);

-- 8. Student Profiles
CREATE TABLE sis_students (
    student_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    program_id INT REFERENCES sis_programs(program_id),
    roll_no VARCHAR(20) UNIQUE NOT NULL,
    cnic VARCHAR(15) UNIQUE,
    dob DATE,
    address TEXT,
    phone VARCHAR(20),
    blood_group VARCHAR(5),
    guardian_name VARCHAR(100),
    guardian_phone VARCHAR(20),
    current_semester INT DEFAULT 1,
    -- AI Field: Stores 'Green', 'Yellow', or 'Red'
    current_risk_status VARCHAR(20) DEFAULT 'Green',
    profile_image_id VARCHAR(100) -- Ref to MongoDB
);

-- 9. Faculty Profiles
CREATE TABLE sis_faculty (
    faculty_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    dept_id INT REFERENCES sis_departments(dept_id),
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    designation VARCHAR(50), -- 'Lecturer', 'Professor'
    phone VARCHAR(20),
    specialization VARCHAR(100),
    office_location VARCHAR(100),
    employment_status VARCHAR(30),
    joining_date DATE,
    qualification VARCHAR(150),
    experience VARCHAR(100),
    research_interests TEXT,
    publications TEXT,
    personal_email VARCHAR(255),
    linkedin_url VARCHAR(255),
    office_hours VARCHAR(100),
    -- Secure Field: Encrypted salary string
    salary_tier_encrypted TEXT,
    profile_image_id VARCHAR(100) -- Ref to MongoDB
);

-- 10. Semesters
CREATE TABLE sis_semesters (
    semester_id SERIAL PRIMARY KEY,
    title VARCHAR(50), -- e.g., 'Fall 2025'
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE
);

-- 11. Transcripts (Finalized Results)
CREATE TABLE sis_transcripts (
    transcript_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    semester_id INT REFERENCES sis_semesters(semester_id),
    sgpa FLOAT,
    cgpa FLOAT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- MODULE 3: LEARNING MANAGEMENT SYSTEM (LMS)
-- ==========================================================

-- 12. Courses (Specific Classes / Enrollable Entities)
CREATE TABLE lms_courses (
    course_id SERIAL PRIMARY KEY,
    dept_id INT REFERENCES sis_departments(dept_id),
    program_id INT REFERENCES sis_programs(program_id),
    semester_id INT REFERENCES sis_semesters(semester_id),
    faculty_id INT REFERENCES sis_faculty(faculty_id),
    code VARCHAR(20) UNIQUE, -- e.g., 'CS101-Morning'
    title VARCHAR(100),
    description TEXT,
    credit_hours INT,
    capacity INT DEFAULT 50,
    room_no VARCHAR(20),
    cover_image VARCHAR(255),
    -- Scheduling Load
    lectures_per_week INT DEFAULT 1,
    lecture_duration_minutes INT DEFAULT 60
);

-- *SIS ENROLLMENTS*
-- 14. Enrollments (Link to Course Instance)
CREATE TABLE sis_enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    course_id INT REFERENCES lms_courses(course_id),
    status VARCHAR(20) DEFAULT 'Enrolled', -- 'Enrolled', 'Withdrawn', 'Dropped'
    final_grade_points FLOAT
);

-- 15. Assignments
CREATE TABLE lms_assignments (
    assignment_id SERIAL PRIMARY KEY,
    course_id INT REFERENCES lms_courses(course_id),
    title VARCHAR(100),
    description TEXT,
    total_marks INT,
    due_date TIMESTAMP,
    attachment_ref_id VARCHAR(100) -- Ref to MongoDB
);

-- 16. Submissions
CREATE TABLE lms_submissions (
    sub_id SERIAL PRIMARY KEY,
    assignment_id INT REFERENCES lms_assignments(assignment_id),
    student_id INT REFERENCES sis_students(student_id),
    submitted_at TIMESTAMP,
    marks_obtained FLOAT,
    file_ref_id VARCHAR(100) -- Ref to MongoDB
);

-- 17. Quizzes
CREATE TABLE lms_quizzes (
    quiz_id SERIAL PRIMARY KEY,
    course_id INT REFERENCES lms_courses(course_id),
    title VARCHAR(100),
    duration_minutes INT,
    start_time TIMESTAMP,
    end_time TIMESTAMP
);

-- 18. Questions
CREATE TABLE lms_questions (
    question_id SERIAL PRIMARY KEY,
    quiz_id INT REFERENCES lms_quizzes(quiz_id),
    text TEXT NOT NULL,
    question_type VARCHAR(20), -- 'MCQ', 'TrueFalse'
    marks FLOAT,
    correct_answer TEXT
);

-- 19. Answers (Student Attempts)
CREATE TABLE lms_answers (
    answer_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    quiz_id INT REFERENCES lms_quizzes(quiz_id), -- Linking to Quiz for summary
    question_id INT REFERENCES lms_questions(question_id), -- Linking to specific question
    selected_option TEXT,
    score_obtained FLOAT
);

-- 20. Attendance (Smart Attendance Logs)
CREATE TABLE lms_attendance (
    attendance_id SERIAL PRIMARY KEY,
    course_id INT REFERENCES lms_courses(course_id),
    student_id INT REFERENCES sis_students(student_id),
    date DATE NOT NULL,
    status VARCHAR(10) CHECK (status IN ('Present', 'Absent', 'Leave', 'Late')),
    check_in_time TIME,
    gps_lat FLOAT, -- Geofencing Data
    gps_long FLOAT, -- Geofencing Data
    is_biometric_verified BOOLEAN DEFAULT TRUE
);

-- 21. Timetable Slots (Constraint Logic)
CREATE TABLE lms_timetable_slots (
    slot_id SERIAL PRIMARY KEY,
    course_id INT REFERENCES lms_courses(course_id),
    day_of_week VARCHAR(10), -- 'Monday', 'Tuesday'
    start_time TIME,
    end_time TIME,
    room_no VARCHAR(20)
);

-- 21b. Classrooms (Scheduler support)
CREATE TABLE sis_classrooms (
    classroom_id SERIAL PRIMARY KEY,
    room_no VARCHAR(20) UNIQUE NOT NULL
);

-- 21c. Scheduler Constraints (hard blocks for faculty/rooms)
CREATE TABLE sched_constraints (
    constraint_id SERIAL PRIMARY KEY,
    resource_type VARCHAR(20) NOT NULL, -- 'faculty' | 'room'
    resource_id VARCHAR(64) NOT NULL,
    day_of_week VARCHAR(10) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    note VARCHAR(255)
);

-- ==========================================================
-- MODULE 4: FINANCIAL & BILLING
-- ==========================================================

-- 22. Fee Heads (Structure)
CREATE TABLE fin_fee_heads (
    head_id SERIAL PRIMARY KEY,
    title VARCHAR(100), -- 'Tuition', 'Transport', 'Lab'
    default_amount DECIMAL(10, 2)
);

-- 23. Invoices (Master Table)
CREATE TABLE fin_invoices (
    invoice_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    semester_id INT REFERENCES sis_semesters(semester_id),
    total_amount DECIMAL(10, 2),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'Unpaid' -- 'Paid', 'Unpaid', 'Overdue'
);

-- 24. Invoice Items (Detail Table)
CREATE TABLE fin_invoice_items (
    item_id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES fin_invoices(invoice_id),
    head_id INT REFERENCES fin_fee_heads(head_id),
    amount DECIMAL(10, 2)
);

-- 25. Transactions (Payment Gateway Logs)
CREATE TABLE fin_transactions (
    trx_id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES fin_invoices(invoice_id),
    gateway_ref VARCHAR(100), -- Stripe/JazzCash ID
    amount_paid DECIMAL(10, 2),
    trx_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method VARCHAR(20) -- 'Stripe', 'JazzCash', 'BankChallan'
);

-- 26. Fines
CREATE TABLE fin_fines (
    fine_id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES fin_invoices(invoice_id),
    days_overdue INT,
    fine_amount DECIMAL(10, 2),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- MODULE 5: LIBRARY & OPERATIONS
-- ==========================================================

-- 27. Library Books
CREATE TABLE lib_books (
    book_id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE,
    title VARCHAR(200),
    author VARCHAR(100),
    category VARCHAR(50),
    publisher VARCHAR(100),
    publication_year INT,
    pages INT,
    cover_image TEXT,
    description TEXT,
    language VARCHAR(30) DEFAULT 'English',
    total_copies INT,
    available_copies INT,
    shelf_location VARCHAR(50)
);

-- 28. Book Issues
CREATE TABLE lib_issues (
    issue_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    book_id INT REFERENCES lib_books(book_id),
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'Issued' -- 'Issued', 'Returned', 'Lost'
);

-- 29. Leaves (Staff/Faculty)
CREATE TABLE ops_leaves (
    leave_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id),
    leave_type VARCHAR(50), -- 'Sick', 'Casual'
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending' -- 'Pending', 'Approved', 'Rejected'
);

-- 29b. Leave Supporting Documents (HR service)
CREATE TABLE ops_leave_documents (
    document_id SERIAL PRIMARY KEY,
    leave_id INT REFERENCES ops_leaves(leave_id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 30. Grievances (Help Desk)
CREATE TABLE ops_grievances (
    ticket_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    category VARCHAR(50), -- 'Academic', 'Facilities', 'Harassment'
    subject VARCHAR(200),
    description TEXT,
    status VARCHAR(20) DEFAULT 'Open',
    priority VARCHAR(20) DEFAULT 'Normal',
    is_urgent BOOLEAN DEFAULT FALSE,
    assigned_department VARCHAR(100),
    resolution TEXT,
    satisfaction_rating INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 31. Alumni Registry
CREATE TABLE alumni_registry (
    alumni_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    grad_year INT,
    degree VARCHAR(100),
    current_employer VARCHAR(100),
    current_position VARCHAR(100),
    location VARCHAR(100),
    photo_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    achievements TEXT, -- JSON array stored as text
    expertise TEXT,    -- JSON array stored as text
    UNIQUE(student_id)
);

-- 32. Alumni Jobs
CREATE TABLE alumni_jobs (
    job_id SERIAL PRIMARY KEY,
    alumni_id INT REFERENCES alumni_registry(alumni_id),
    title VARCHAR(100),
    company VARCHAR(100),
    description TEXT,
    apply_link VARCHAR(255),
    location VARCHAR(100),
    job_type VARCHAR(50), -- 'Full-time', 'Part-time', 'Internship'
    cover_image TEXT,
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'Pending' -- 'Pending', 'Approved', 'Rejected'
);

-- ==========================================================
-- MODULE 6: ADDITIONAL TABLES FOR FRONTEND FEATURES
-- ==========================================================

-- 33. Library Reservations
CREATE TABLE lib_reservations (
    reservation_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES sis_students(student_id),
    book_id INT REFERENCES lib_books(book_id),
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active' -- 'Active', 'Fulfilled', 'Cancelled', 'Expired'
);

-- 33b. Librarian Profiles
CREATE TABLE lib_librarian_profiles (
    librarian_profile_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE UNIQUE,
    employee_code VARCHAR(20) UNIQUE,
    shift VARCHAR(20),
    assigned_section VARCHAR(100),
    joining_date DATE,
    experience VARCHAR(100),
    qualification VARCHAR(150),
    working_hours VARCHAR(100),
    emergency_contact VARCHAR(20),
    profile_image_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 34. Course Materials (LMS)
CREATE TABLE lms_course_materials (
    material_id SERIAL PRIMARY KEY,
    course_id INT REFERENCES lms_courses(course_id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    material_type VARCHAR(50), -- 'PDF', 'Video', 'Slide', 'Link'
    file_ref_id VARCHAR(255), -- Ref to MongoDB / external URL
    uploaded_by INT REFERENCES sis_faculty(faculty_id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 35. Notifications
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(50), -- 'academic', 'finance', 'attendance', 'announcement', 'system'
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 35b. HR Notifications
CREATE TABLE hr_notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 36. Support Tickets
CREATE TABLE support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'Technical', 'Academic', 'Billing', 'General'
    priority VARCHAR(20) DEFAULT 'Medium',
    status VARCHAR(20) DEFAULT 'Open', -- 'Open', 'In Progress', 'Resolved', 'Closed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 37. Support Ticket Messages (Conversation Thread)
CREATE TABLE support_ticket_messages (
    message_id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth_users(user_id),
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 38. Grievance Comments
CREATE TABLE ops_grievance_comments (
    comment_id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES ops_grievances(ticket_id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth_users(user_id),
    author_role VARCHAR(50),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 39. Alumni Events
CREATE TABLE alumni_events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    venue VARCHAR(200),
    event_type VARCHAR(50), -- 'Reunion', 'Workshop', 'Seminar', 'Social'
    capacity INT,
    registered_count INT DEFAULT 0,
    fee DECIMAL(10, 2) DEFAULT 0,
    organizer VARCHAR(100),
    cover_image TEXT,
    status VARCHAR(20) DEFAULT 'Upcoming', -- 'Upcoming', 'Ongoing', 'Completed', 'Cancelled'
    created_by UUID REFERENCES auth_users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 40. Alumni Event Registrations
CREATE TABLE alumni_event_registrations (
    registration_id SERIAL PRIMARY KEY,
    event_id INT REFERENCES alumni_events(event_id) ON DELETE CASCADE,
    alumni_id INT REFERENCES alumni_registry(alumni_id) ON DELETE CASCADE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, alumni_id)
);

-- 41. Alumni Mentorship
CREATE TABLE alumni_mentorship (
    mentorship_id SERIAL PRIMARY KEY,
    mentor_id INT REFERENCES alumni_registry(alumni_id) ON DELETE CASCADE,
    specialization VARCHAR(100),
    bio TEXT,
    available_slots INT DEFAULT 5,
    sessions_completed INT DEFAULT 0,
    rating FLOAT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mentor_id)
);

-- 42. Alumni Success Stories
CREATE TABLE alumni_success_stories (
    story_id SERIAL PRIMARY KEY,
    alumni_id INT REFERENCES alumni_registry(alumni_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT,
    likes_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 43. Department Head Assignments
CREATE TABLE sis_department_heads (
    id SERIAL PRIMARY KEY,
    dept_id INT REFERENCES sis_departments(dept_id) ON DELETE CASCADE,
    faculty_id INT REFERENCES sis_faculty(faculty_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dept_id)
);

-- ==========================================================
-- SEED DATA: Default Roles
-- ==========================================================
INSERT INTO auth_roles (role_name, description) VALUES
    ('student',   'Student user'),
    ('faculty',   'Faculty member'),
    ('admin',     'System administrator'),
    ('hod',       'Head of Department'),
    ('librarian', 'Library staff'),
    ('alumni',    'Alumni member')
ON CONFLICT (role_name) DO NOTHING;
