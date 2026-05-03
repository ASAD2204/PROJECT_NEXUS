--
-- PostgreSQL database dump
--

\restrict 0DC7b5CMt0kaIOh9ehBgHm5dW7S9oWP7YgZKdKXKe0YfMXBABiBpjpttZdMia4i

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alumni_event_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_event_registrations (
    registration_id integer NOT NULL,
    event_id integer,
    alumni_id integer,
    registered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: alumni_event_registrations_registration_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alumni_event_registrations_registration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alumni_event_registrations_registration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alumni_event_registrations_registration_id_seq OWNED BY public.alumni_event_registrations.registration_id;


--
-- Name: alumni_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_events (
    event_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    event_date date NOT NULL,
    event_time time without time zone,
    venue character varying(200),
    event_type character varying(50),
    capacity integer,
    registered_count integer DEFAULT 0,
    fee numeric(10,2) DEFAULT 0,
    organizer character varying(100),
    cover_image character varying(255),
    status character varying(20) DEFAULT 'Upcoming'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: alumni_events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alumni_events_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alumni_events_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alumni_events_event_id_seq OWNED BY public.alumni_events.event_id;


--
-- Name: alumni_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_jobs (
    job_id integer NOT NULL,
    alumni_id integer,
    title character varying(100),
    company character varying(100),
    description text,
    apply_link character varying(255),
    location character varying(100),
    job_type character varying(50),
    posted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'Pending'::character varying,
    cover_image character varying(255)
);


--
-- Name: alumni_jobs_job_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alumni_jobs_job_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alumni_jobs_job_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alumni_jobs_job_id_seq OWNED BY public.alumni_jobs.job_id;


--
-- Name: alumni_mentorship; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_mentorship (
    mentorship_id integer NOT NULL,
    mentor_id integer,
    specialization character varying(100),
    bio text,
    available_slots integer DEFAULT 5,
    sessions_completed integer DEFAULT 0,
    rating double precision DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: alumni_mentorship_mentorship_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alumni_mentorship_mentorship_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alumni_mentorship_mentorship_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alumni_mentorship_mentorship_id_seq OWNED BY public.alumni_mentorship.mentorship_id;


--
-- Name: alumni_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_registry (
    alumni_id integer NOT NULL,
    student_id integer,
    grad_year integer,
    degree character varying(100),
    current_employer character varying(100),
    current_position character varying(100),
    location character varying(100),
    photo_url character varying(255),
    linkedin_url character varying(255),
    achievements text,
    expertise text
);


--
-- Name: alumni_registry_alumni_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alumni_registry_alumni_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alumni_registry_alumni_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alumni_registry_alumni_id_seq OWNED BY public.alumni_registry.alumni_id;


--
-- Name: alumni_success_stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_success_stories (
    story_id integer NOT NULL,
    alumni_id integer,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    cover_image character varying(255),
    likes_count integer DEFAULT 0,
    is_featured boolean DEFAULT false,
    status character varying(20) DEFAULT 'Pending'::character varying,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: alumni_success_stories_story_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alumni_success_stories_story_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alumni_success_stories_story_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alumni_success_stories_story_id_seq OWNED BY public.alumni_success_stories.story_id;


--
-- Name: auth_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_api_keys (
    key_id integer NOT NULL,
    user_id uuid,
    service_name character varying(100),
    api_key_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone
);


--
-- Name: auth_api_keys_key_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_api_keys_key_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_api_keys_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_api_keys_key_id_seq OWNED BY public.auth_api_keys.key_id;


--
-- Name: auth_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_permissions (
    perm_id integer NOT NULL,
    role_id integer,
    resource character varying(50),
    action_slug character varying(50)
);


--
-- Name: auth_permissions_perm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_permissions_perm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_permissions_perm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_permissions_perm_id_seq OWNED BY public.auth_permissions.perm_id;


--
-- Name: auth_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_roles (
    role_id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    description text
);


--
-- Name: auth_roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_roles_role_id_seq OWNED BY public.auth_roles.role_id;


--
-- Name: auth_user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_user_roles (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: auth_user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_user_roles_id_seq OWNED BY public.auth_user_roles.id;


--
-- Name: auth_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_users (
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    phone character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone
);


--
-- Name: fin_fee_heads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fin_fee_heads (
    head_id integer NOT NULL,
    title character varying(100),
    default_amount numeric(10,2)
);


--
-- Name: fin_fee_heads_head_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fin_fee_heads_head_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_fee_heads_head_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_fee_heads_head_id_seq OWNED BY public.fin_fee_heads.head_id;


--
-- Name: fin_fee_structure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fin_fee_structure (
    struct_id integer NOT NULL,
    dept_id integer,
    program_id integer,
    semester_id integer,
    head_id integer,
    amount numeric(10,2) NOT NULL
);


--
-- Name: fin_fee_structure_struct_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fin_fee_structure_struct_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_fee_structure_struct_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_fee_structure_struct_id_seq OWNED BY public.fin_fee_structure.struct_id;


--
-- Name: fin_fines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fin_fines (
    fine_id integer NOT NULL,
    invoice_id integer,
    days_overdue integer,
    fine_amount numeric(10,2),
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: fin_fines_fine_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fin_fines_fine_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_fines_fine_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_fines_fine_id_seq OWNED BY public.fin_fines.fine_id;


--
-- Name: fin_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fin_invoice_items (
    item_id integer NOT NULL,
    invoice_id integer,
    head_id integer,
    amount numeric(10,2)
);


--
-- Name: fin_invoice_items_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fin_invoice_items_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_invoice_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_invoice_items_item_id_seq OWNED BY public.fin_invoice_items.item_id;


--
-- Name: fin_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fin_invoices (
    invoice_id integer NOT NULL,
    student_id integer,
    semester_id integer,
    total_amount numeric(10,2),
    due_date date,
    status character varying(20) DEFAULT 'Unpaid'::character varying
);


--
-- Name: fin_invoices_invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fin_invoices_invoice_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_invoices_invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_invoices_invoice_id_seq OWNED BY public.fin_invoices.invoice_id;


--
-- Name: fin_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fin_transactions (
    trx_id integer NOT NULL,
    invoice_id integer,
    gateway_ref character varying(100),
    amount_paid numeric(10,2),
    trx_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    method character varying(20)
);


--
-- Name: fin_transactions_trx_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fin_transactions_trx_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fin_transactions_trx_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fin_transactions_trx_id_seq OWNED BY public.fin_transactions.trx_id;


--
-- Name: hr_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_notifications (
    notification_id integer NOT NULL,
    user_id uuid,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: hr_notifications_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_notifications_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_notifications_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_notifications_notification_id_seq OWNED BY public.hr_notifications.notification_id;


--
-- Name: lib_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lib_books (
    book_id integer NOT NULL,
    isbn character varying(20),
    title character varying(200),
    author character varying(100),
    category character varying(50),
    publisher character varying(100),
    publication_year integer,
    pages integer,
    cover_image character varying(255),
    description text,
    language character varying(30) DEFAULT 'English'::character varying,
    total_copies integer,
    available_copies integer,
    shelf_location character varying(50)
);


--
-- Name: lib_books_book_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lib_books_book_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lib_books_book_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lib_books_book_id_seq OWNED BY public.lib_books.book_id;


--
-- Name: lib_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lib_issues (
    issue_id integer NOT NULL,
    student_id integer,
    book_id integer,
    issue_date date DEFAULT CURRENT_DATE,
    due_date date,
    return_date date,
    status character varying(20) DEFAULT 'Issued'::character varying
);


--
-- Name: lib_issues_issue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lib_issues_issue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lib_issues_issue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lib_issues_issue_id_seq OWNED BY public.lib_issues.issue_id;


--
-- Name: lib_librarian_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lib_librarian_profiles (
    librarian_profile_id integer NOT NULL,
    user_id uuid,
    employee_code character varying(20),
    shift character varying(20),
    assigned_section character varying(100),
    joining_date date,
    experience character varying(100),
    qualification character varying(150),
    working_hours character varying(100),
    emergency_contact character varying(20),
    profile_image_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: lib_librarian_profiles_librarian_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lib_librarian_profiles_librarian_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lib_librarian_profiles_librarian_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lib_librarian_profiles_librarian_profile_id_seq OWNED BY public.lib_librarian_profiles.librarian_profile_id;


--
-- Name: lib_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lib_reservations (
    reservation_id integer NOT NULL,
    student_id integer,
    book_id integer,
    reserved_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    status character varying(20) DEFAULT 'Active'::character varying
);


--
-- Name: lib_reservations_reservation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lib_reservations_reservation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lib_reservations_reservation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lib_reservations_reservation_id_seq OWNED BY public.lib_reservations.reservation_id;


--
-- Name: lms_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_answers (
    answer_id integer NOT NULL,
    student_id integer,
    quiz_id integer,
    question_id integer,
    selected_option text,
    score_obtained double precision
);


--
-- Name: lms_answers_answer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_answers_answer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_answers_answer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_answers_answer_id_seq OWNED BY public.lms_answers.answer_id;


--
-- Name: lms_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_assignments (
    assignment_id integer NOT NULL,
    section_id integer,
    title character varying(100),
    description text,
    total_marks integer,
    due_date timestamp without time zone,
    attachment_ref_id character varying(100)
);


--
-- Name: lms_assignments_assignment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_assignments_assignment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_assignments_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_assignments_assignment_id_seq OWNED BY public.lms_assignments.assignment_id;


--
-- Name: lms_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_attendance (
    attendance_id integer NOT NULL,
    section_id integer,
    student_id integer,
    date date NOT NULL,
    status character varying(10),
    check_in_time time without time zone,
    gps_lat double precision,
    gps_long double precision,
    is_biometric_verified boolean DEFAULT true,
    CONSTRAINT lms_attendance_status_check CHECK (((status)::text = ANY ((ARRAY['Present'::character varying, 'Absent'::character varying, 'Leave'::character varying, 'Late'::character varying])::text[])))
);


--
-- Name: lms_attendance_attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_attendance_attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_attendance_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_attendance_attendance_id_seq OWNED BY public.lms_attendance.attendance_id;


--
-- Name: lms_course_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_course_materials (
    material_id integer NOT NULL,
    section_id integer,
    title character varying(200) NOT NULL,
    description text,
    material_type character varying(50),
    file_ref_id character varying(255),
    uploaded_by integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: lms_course_materials_material_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_course_materials_material_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_course_materials_material_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_course_materials_material_id_seq OWNED BY public.lms_course_materials.material_id;


--
-- Name: lms_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_courses (
    course_id integer NOT NULL,
    dept_id integer,
    code character varying(10),
    title character varying(100),
    description text,
    credit_hours integer,
    cover_image character varying(255),
    program_id integer
);


--
-- Name: lms_courses_course_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_courses_course_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_courses_course_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_courses_course_id_seq OWNED BY public.lms_courses.course_id;


--
-- Name: lms_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_questions (
    question_id integer NOT NULL,
    quiz_id integer,
    text text NOT NULL,
    question_type character varying(20),
    marks double precision,
    correct_answer text
);


--
-- Name: lms_questions_question_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_questions_question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_questions_question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_questions_question_id_seq OWNED BY public.lms_questions.question_id;


--
-- Name: lms_quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_quizzes (
    quiz_id integer NOT NULL,
    section_id integer,
    title character varying(100),
    duration_minutes integer,
    start_time timestamp without time zone,
    end_time timestamp without time zone
);


--
-- Name: lms_quizzes_quiz_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_quizzes_quiz_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_quizzes_quiz_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_quizzes_quiz_id_seq OWNED BY public.lms_quizzes.quiz_id;


--
-- Name: lms_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_sections (
    section_id integer NOT NULL,
    course_id integer,
    semester_id integer,
    faculty_id integer,
    room_no character varying(20),
    capacity integer
);


--
-- Name: lms_sections_section_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_sections_section_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_sections_section_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_sections_section_id_seq OWNED BY public.lms_sections.section_id;


--
-- Name: lms_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_submissions (
    sub_id integer NOT NULL,
    assignment_id integer,
    student_id integer,
    submitted_at timestamp without time zone,
    marks_obtained double precision,
    file_ref_id character varying(100)
);


--
-- Name: lms_submissions_sub_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_submissions_sub_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_submissions_sub_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_submissions_sub_id_seq OWNED BY public.lms_submissions.sub_id;


--
-- Name: lms_timetable_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lms_timetable_slots (
    slot_id integer NOT NULL,
    section_id integer,
    day_of_week character varying(10),
    start_time time without time zone,
    end_time time without time zone,
    room_no character varying(20)
);


--
-- Name: lms_timetable_slots_slot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lms_timetable_slots_slot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lms_timetable_slots_slot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lms_timetable_slots_slot_id_seq OWNED BY public.lms_timetable_slots.slot_id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    notification_id integer NOT NULL,
    user_id uuid,
    title character varying(200) NOT NULL,
    message text,
    type character varying(50),
    is_read boolean DEFAULT false,
    link character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_notification_id_seq OWNED BY public.notifications.notification_id;


--
-- Name: ops_grievance_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ops_grievance_comments (
    comment_id integer NOT NULL,
    ticket_id integer,
    author_id uuid,
    author_role character varying(50),
    text text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ops_grievance_comments_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ops_grievance_comments_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ops_grievance_comments_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ops_grievance_comments_comment_id_seq OWNED BY public.ops_grievance_comments.comment_id;


--
-- Name: ops_grievances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ops_grievances (
    ticket_id integer NOT NULL,
    student_id integer,
    category character varying(50),
    subject character varying(200),
    description text,
    status character varying(20) DEFAULT 'Open'::character varying,
    priority character varying(20) DEFAULT 'Normal'::character varying,
    is_urgent boolean DEFAULT false,
    assigned_department character varying(100),
    resolution text,
    satisfaction_rating integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ops_grievances_ticket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ops_grievances_ticket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ops_grievances_ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ops_grievances_ticket_id_seq OWNED BY public.ops_grievances.ticket_id;


--
-- Name: ops_leave_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ops_leave_documents (
    document_id integer NOT NULL,
    leave_id integer,
    document_url text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ops_leave_documents_document_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ops_leave_documents_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ops_leave_documents_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ops_leave_documents_document_id_seq OWNED BY public.ops_leave_documents.document_id;


--
-- Name: ops_leaves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ops_leaves (
    leave_id integer NOT NULL,
    user_id uuid,
    leave_type character varying(50),
    start_date date,
    end_date date,
    reason text,
    status character varying(20) DEFAULT 'Pending'::character varying
);


--
-- Name: ops_leaves_leave_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ops_leaves_leave_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ops_leaves_leave_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ops_leaves_leave_id_seq OWNED BY public.ops_leaves.leave_id;


--
-- Name: sched_constraints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sched_constraints (
    constraint_id integer NOT NULL,
    resource_type character varying(20) NOT NULL,
    resource_id character varying(64) NOT NULL,
    day_of_week character varying(10) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    note character varying(255)
);


--
-- Name: sched_constraints_constraint_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sched_constraints_constraint_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sched_constraints_constraint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sched_constraints_constraint_id_seq OWNED BY public.sched_constraints.constraint_id;


--
-- Name: sis_classrooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_classrooms (
    classroom_id integer NOT NULL,
    room_no character varying(20) NOT NULL
);


--
-- Name: sis_classrooms_classroom_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_classrooms_classroom_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_classrooms_classroom_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_classrooms_classroom_id_seq OWNED BY public.sis_classrooms.classroom_id;


--
-- Name: sis_department_heads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_department_heads (
    id integer NOT NULL,
    dept_id integer,
    faculty_id integer,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sis_department_heads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_department_heads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_department_heads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_department_heads_id_seq OWNED BY public.sis_department_heads.id;


--
-- Name: sis_departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_departments (
    dept_id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10),
    location character varying(100)
);


--
-- Name: sis_departments_dept_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_departments_dept_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_departments_dept_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_departments_dept_id_seq OWNED BY public.sis_departments.dept_id;


--
-- Name: sis_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_enrollments (
    enrollment_id integer NOT NULL,
    student_id integer,
    section_id integer,
    status character varying(20) DEFAULT 'Enrolled'::character varying,
    final_grade_points double precision
);


--
-- Name: sis_enrollments_enrollment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_enrollments_enrollment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_enrollments_enrollment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_enrollments_enrollment_id_seq OWNED BY public.sis_enrollments.enrollment_id;


--
-- Name: sis_faculty; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_faculty (
    faculty_id integer NOT NULL,
    user_id uuid,
    dept_id integer,
    employee_code character varying(20) NOT NULL,
    designation character varying(50),
    phone character varying(20),
    specialization character varying(100),
    office_location character varying(100),
    employment_status character varying(30),
    joining_date date,
    qualification character varying(150),
    experience character varying(100),
    research_interests text,
    publications text,
    personal_email character varying(255),
    linkedin_url character varying(255),
    office_hours character varying(100),
    salary_tier_encrypted text,
    profile_image_id character varying(100)
);


--
-- Name: sis_faculty_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_faculty_availability (
    avail_id integer NOT NULL,
    faculty_id integer NOT NULL,
    day_of_week character varying(10) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_available boolean
);


--
-- Name: sis_faculty_availability_avail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_faculty_availability_avail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_faculty_availability_avail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_faculty_availability_avail_id_seq OWNED BY public.sis_faculty_availability.avail_id;


--
-- Name: sis_faculty_faculty_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_faculty_faculty_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_faculty_faculty_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_faculty_faculty_id_seq OWNED BY public.sis_faculty.faculty_id;


--
-- Name: sis_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_programs (
    program_id integer NOT NULL,
    dept_id integer,
    title character varying(100),
    degree_level character varying(20),
    total_semesters integer,
    tuition_fee numeric(10,2)
);


--
-- Name: sis_programs_program_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_programs_program_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_programs_program_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_programs_program_id_seq OWNED BY public.sis_programs.program_id;


--
-- Name: sis_semesters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_semesters (
    semester_id integer NOT NULL,
    title character varying(50),
    start_date date,
    end_date date,
    is_active boolean DEFAULT false
);


--
-- Name: sis_semesters_semester_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_semesters_semester_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_semesters_semester_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_semesters_semester_id_seq OWNED BY public.sis_semesters.semester_id;


--
-- Name: sis_students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_students (
    student_id integer NOT NULL,
    user_id uuid,
    program_id integer,
    roll_no character varying(20) NOT NULL,
    cnic character varying(15),
    dob date,
    address text,
    phone character varying(20),
    blood_group character varying(5),
    guardian_name character varying(100),
    guardian_phone character varying(20),
    current_semester integer DEFAULT 1,
    current_risk_status character varying(20) DEFAULT 'Green'::character varying,
    profile_image_id character varying(100),
    scholarship_percentage double precision DEFAULT 0.0
);


--
-- Name: sis_students_student_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_students_student_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_students_student_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_students_student_id_seq OWNED BY public.sis_students.student_id;


--
-- Name: sis_transcripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sis_transcripts (
    transcript_id integer NOT NULL,
    student_id integer,
    semester_id integer,
    sgpa double precision,
    cgpa double precision,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sis_transcripts_transcript_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sis_transcripts_transcript_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sis_transcripts_transcript_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sis_transcripts_transcript_id_seq OWNED BY public.sis_transcripts.transcript_id;


--
-- Name: support_ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_messages (
    message_id integer NOT NULL,
    ticket_id integer,
    sender_id uuid,
    message text NOT NULL,
    is_staff_reply boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: support_ticket_messages_message_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_ticket_messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_ticket_messages_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_ticket_messages_message_id_seq OWNED BY public.support_ticket_messages.message_id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    ticket_id integer NOT NULL,
    user_id uuid,
    subject character varying(200) NOT NULL,
    description text,
    category character varying(50),
    priority character varying(20) DEFAULT 'Medium'::character varying,
    status character varying(20) DEFAULT 'Open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: support_tickets_ticket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_ticket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_ticket_id_seq OWNED BY public.support_tickets.ticket_id;


--
-- Name: alumni_event_registrations registration_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_event_registrations ALTER COLUMN registration_id SET DEFAULT nextval('public.alumni_event_registrations_registration_id_seq'::regclass);


--
-- Name: alumni_events event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_events ALTER COLUMN event_id SET DEFAULT nextval('public.alumni_events_event_id_seq'::regclass);


--
-- Name: alumni_jobs job_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_jobs ALTER COLUMN job_id SET DEFAULT nextval('public.alumni_jobs_job_id_seq'::regclass);


--
-- Name: alumni_mentorship mentorship_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_mentorship ALTER COLUMN mentorship_id SET DEFAULT nextval('public.alumni_mentorship_mentorship_id_seq'::regclass);


--
-- Name: alumni_registry alumni_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_registry ALTER COLUMN alumni_id SET DEFAULT nextval('public.alumni_registry_alumni_id_seq'::regclass);


--
-- Name: alumni_success_stories story_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_success_stories ALTER COLUMN story_id SET DEFAULT nextval('public.alumni_success_stories_story_id_seq'::regclass);


--
-- Name: auth_api_keys key_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_api_keys ALTER COLUMN key_id SET DEFAULT nextval('public.auth_api_keys_key_id_seq'::regclass);


--
-- Name: auth_permissions perm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permissions ALTER COLUMN perm_id SET DEFAULT nextval('public.auth_permissions_perm_id_seq'::regclass);


--
-- Name: auth_roles role_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_roles ALTER COLUMN role_id SET DEFAULT nextval('public.auth_roles_role_id_seq'::regclass);


--
-- Name: auth_user_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_roles ALTER COLUMN id SET DEFAULT nextval('public.auth_user_roles_id_seq'::regclass);


--
-- Name: fin_fee_heads head_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_fee_heads ALTER COLUMN head_id SET DEFAULT nextval('public.fin_fee_heads_head_id_seq'::regclass);


--
-- Name: fin_fee_structure struct_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_fee_structure ALTER COLUMN struct_id SET DEFAULT nextval('public.fin_fee_structure_struct_id_seq'::regclass);


--
-- Name: fin_fines fine_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_fines ALTER COLUMN fine_id SET DEFAULT nextval('public.fin_fines_fine_id_seq'::regclass);


--
-- Name: fin_invoice_items item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_invoice_items ALTER COLUMN item_id SET DEFAULT nextval('public.fin_invoice_items_item_id_seq'::regclass);


--
-- Name: fin_invoices invoice_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_invoices ALTER COLUMN invoice_id SET DEFAULT nextval('public.fin_invoices_invoice_id_seq'::regclass);


--
-- Name: fin_transactions trx_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_transactions ALTER COLUMN trx_id SET DEFAULT nextval('public.fin_transactions_trx_id_seq'::regclass);


--
-- Name: hr_notifications notification_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_notifications ALTER COLUMN notification_id SET DEFAULT nextval('public.hr_notifications_notification_id_seq'::regclass);


--
-- Name: lib_books book_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_books ALTER COLUMN book_id SET DEFAULT nextval('public.lib_books_book_id_seq'::regclass);


--
-- Name: lib_issues issue_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_issues ALTER COLUMN issue_id SET DEFAULT nextval('public.lib_issues_issue_id_seq'::regclass);


--
-- Name: lib_librarian_profiles librarian_profile_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_librarian_profiles ALTER COLUMN librarian_profile_id SET DEFAULT nextval('public.lib_librarian_profiles_librarian_profile_id_seq'::regclass);


--
-- Name: lib_reservations reservation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_reservations ALTER COLUMN reservation_id SET DEFAULT nextval('public.lib_reservations_reservation_id_seq'::regclass);


--
-- Name: lms_answers answer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_answers ALTER COLUMN answer_id SET DEFAULT nextval('public.lms_answers_answer_id_seq'::regclass);


--
-- Name: lms_assignments assignment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments ALTER COLUMN assignment_id SET DEFAULT nextval('public.lms_assignments_assignment_id_seq'::regclass);


--
-- Name: lms_attendance attendance_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_attendance ALTER COLUMN attendance_id SET DEFAULT nextval('public.lms_attendance_attendance_id_seq'::regclass);


--
-- Name: lms_course_materials material_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_course_materials ALTER COLUMN material_id SET DEFAULT nextval('public.lms_course_materials_material_id_seq'::regclass);


--
-- Name: lms_courses course_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_courses ALTER COLUMN course_id SET DEFAULT nextval('public.lms_courses_course_id_seq'::regclass);


--
-- Name: lms_questions question_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_questions ALTER COLUMN question_id SET DEFAULT nextval('public.lms_questions_question_id_seq'::regclass);


--
-- Name: lms_quizzes quiz_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_quizzes ALTER COLUMN quiz_id SET DEFAULT nextval('public.lms_quizzes_quiz_id_seq'::regclass);


--
-- Name: lms_sections section_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_sections ALTER COLUMN section_id SET DEFAULT nextval('public.lms_sections_section_id_seq'::regclass);


--
-- Name: lms_submissions sub_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_submissions ALTER COLUMN sub_id SET DEFAULT nextval('public.lms_submissions_sub_id_seq'::regclass);


--
-- Name: lms_timetable_slots slot_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_timetable_slots ALTER COLUMN slot_id SET DEFAULT nextval('public.lms_timetable_slots_slot_id_seq'::regclass);


--
-- Name: notifications notification_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN notification_id SET DEFAULT nextval('public.notifications_notification_id_seq'::regclass);


--
-- Name: ops_grievance_comments comment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_grievance_comments ALTER COLUMN comment_id SET DEFAULT nextval('public.ops_grievance_comments_comment_id_seq'::regclass);


--
-- Name: ops_grievances ticket_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_grievances ALTER COLUMN ticket_id SET DEFAULT nextval('public.ops_grievances_ticket_id_seq'::regclass);


--
-- Name: ops_leave_documents document_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_leave_documents ALTER COLUMN document_id SET DEFAULT nextval('public.ops_leave_documents_document_id_seq'::regclass);


--
-- Name: ops_leaves leave_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_leaves ALTER COLUMN leave_id SET DEFAULT nextval('public.ops_leaves_leave_id_seq'::regclass);


--
-- Name: sched_constraints constraint_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sched_constraints ALTER COLUMN constraint_id SET DEFAULT nextval('public.sched_constraints_constraint_id_seq'::regclass);


--
-- Name: sis_classrooms classroom_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_classrooms ALTER COLUMN classroom_id SET DEFAULT nextval('public.sis_classrooms_classroom_id_seq'::regclass);


--
-- Name: sis_department_heads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_department_heads ALTER COLUMN id SET DEFAULT nextval('public.sis_department_heads_id_seq'::regclass);


--
-- Name: sis_departments dept_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_departments ALTER COLUMN dept_id SET DEFAULT nextval('public.sis_departments_dept_id_seq'::regclass);


--
-- Name: sis_enrollments enrollment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_enrollments ALTER COLUMN enrollment_id SET DEFAULT nextval('public.sis_enrollments_enrollment_id_seq'::regclass);


--
-- Name: sis_faculty faculty_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_faculty ALTER COLUMN faculty_id SET DEFAULT nextval('public.sis_faculty_faculty_id_seq'::regclass);


--
-- Name: sis_faculty_availability avail_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_faculty_availability ALTER COLUMN avail_id SET DEFAULT nextval('public.sis_faculty_availability_avail_id_seq'::regclass);


--
-- Name: sis_programs program_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_programs ALTER COLUMN program_id SET DEFAULT nextval('public.sis_programs_program_id_seq'::regclass);


--
-- Name: sis_semesters semester_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_semesters ALTER COLUMN semester_id SET DEFAULT nextval('public.sis_semesters_semester_id_seq'::regclass);


--
-- Name: sis_students student_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_students ALTER COLUMN student_id SET DEFAULT nextval('public.sis_students_student_id_seq'::regclass);


--
-- Name: sis_transcripts transcript_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_transcripts ALTER COLUMN transcript_id SET DEFAULT nextval('public.sis_transcripts_transcript_id_seq'::regclass);


--
-- Name: support_ticket_messages message_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages ALTER COLUMN message_id SET DEFAULT nextval('public.support_ticket_messages_message_id_seq'::regclass);


--
-- Name: support_tickets ticket_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN ticket_id SET DEFAULT nextval('public.support_tickets_ticket_id_seq'::regclass);


--
-- Name: alumni_event_registrations alumni_event_registrations_event_id_alumni_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_event_registrations
    ADD CONSTRAINT alumni_event_registrations_event_id_alumni_id_key UNIQUE (event_id, alumni_id);


--
-- Name: alumni_event_registrations alumni_event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_event_registrations
    ADD CONSTRAINT alumni_event_registrations_pkey PRIMARY KEY (registration_id);


--
-- Name: alumni_events alumni_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_events
    ADD CONSTRAINT alumni_events_pkey PRIMARY KEY (event_id);


--
-- Name: alumni_jobs alumni_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_jobs
    ADD CONSTRAINT alumni_jobs_pkey PRIMARY KEY (job_id);


--
-- Name: alumni_mentorship alumni_mentorship_mentor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_mentorship
    ADD CONSTRAINT alumni_mentorship_mentor_id_key UNIQUE (mentor_id);


--
-- Name: alumni_mentorship alumni_mentorship_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_mentorship
    ADD CONSTRAINT alumni_mentorship_pkey PRIMARY KEY (mentorship_id);


--
-- Name: alumni_registry alumni_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_registry
    ADD CONSTRAINT alumni_registry_pkey PRIMARY KEY (alumni_id);


--
-- Name: alumni_registry alumni_registry_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_registry
    ADD CONSTRAINT alumni_registry_student_id_key UNIQUE (student_id);


--
-- Name: alumni_success_stories alumni_success_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_success_stories
    ADD CONSTRAINT alumni_success_stories_pkey PRIMARY KEY (story_id);


--
-- Name: auth_api_keys auth_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_api_keys
    ADD CONSTRAINT auth_api_keys_pkey PRIMARY KEY (key_id);


--
-- Name: auth_permissions auth_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permissions
    ADD CONSTRAINT auth_permissions_pkey PRIMARY KEY (perm_id);


--
-- Name: auth_permissions auth_permissions_role_id_resource_action_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permissions
    ADD CONSTRAINT auth_permissions_role_id_resource_action_slug_key UNIQUE (role_id, resource, action_slug);


--
-- Name: auth_roles auth_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_roles
    ADD CONSTRAINT auth_roles_pkey PRIMARY KEY (role_id);


--
-- Name: auth_roles auth_roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_roles
    ADD CONSTRAINT auth_roles_role_name_key UNIQUE (role_name);


--
-- Name: auth_user_roles auth_user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_roles
    ADD CONSTRAINT auth_user_roles_pkey PRIMARY KEY (id);


--
-- Name: auth_users auth_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);


--
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (user_id);


--
-- Name: fin_fee_heads fin_fee_heads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_fee_heads
    ADD CONSTRAINT fin_fee_heads_pkey PRIMARY KEY (head_id);


--
-- Name: fin_fee_structure fin_fee_structure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_fee_structure
    ADD CONSTRAINT fin_fee_structure_pkey PRIMARY KEY (struct_id);


--
-- Name: fin_fines fin_fines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_fines
    ADD CONSTRAINT fin_fines_pkey PRIMARY KEY (fine_id);


--
-- Name: fin_invoice_items fin_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_invoice_items
    ADD CONSTRAINT fin_invoice_items_pkey PRIMARY KEY (item_id);


--
-- Name: fin_invoices fin_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_invoices
    ADD CONSTRAINT fin_invoices_pkey PRIMARY KEY (invoice_id);


--
-- Name: fin_transactions fin_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_transactions
    ADD CONSTRAINT fin_transactions_pkey PRIMARY KEY (trx_id);


--
-- Name: hr_notifications hr_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_notifications
    ADD CONSTRAINT hr_notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: lib_books lib_books_isbn_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_books
    ADD CONSTRAINT lib_books_isbn_key UNIQUE (isbn);


--
-- Name: lib_books lib_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_books
    ADD CONSTRAINT lib_books_pkey PRIMARY KEY (book_id);


--
-- Name: lib_issues lib_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_issues
    ADD CONSTRAINT lib_issues_pkey PRIMARY KEY (issue_id);


--
-- Name: lib_librarian_profiles lib_librarian_profiles_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_librarian_profiles
    ADD CONSTRAINT lib_librarian_profiles_employee_code_key UNIQUE (employee_code);


--
-- Name: lib_librarian_profiles lib_librarian_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_librarian_profiles
    ADD CONSTRAINT lib_librarian_profiles_pkey PRIMARY KEY (librarian_profile_id);


--
-- Name: lib_librarian_profiles lib_librarian_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_librarian_profiles
    ADD CONSTRAINT lib_librarian_profiles_user_id_key UNIQUE (user_id);


--
-- Name: lib_reservations lib_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_reservations
    ADD CONSTRAINT lib_reservations_pkey PRIMARY KEY (reservation_id);


--
-- Name: lms_answers lms_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_answers
    ADD CONSTRAINT lms_answers_pkey PRIMARY KEY (answer_id);


--
-- Name: lms_assignments lms_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: lms_attendance lms_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_attendance
    ADD CONSTRAINT lms_attendance_pkey PRIMARY KEY (attendance_id);


--
-- Name: lms_course_materials lms_course_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_course_materials
    ADD CONSTRAINT lms_course_materials_pkey PRIMARY KEY (material_id);


--
-- Name: lms_courses lms_courses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_courses
    ADD CONSTRAINT lms_courses_code_key UNIQUE (code);


--
-- Name: lms_courses lms_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_courses
    ADD CONSTRAINT lms_courses_pkey PRIMARY KEY (course_id);


--
-- Name: lms_questions lms_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_questions
    ADD CONSTRAINT lms_questions_pkey PRIMARY KEY (question_id);


--
-- Name: lms_quizzes lms_quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_quizzes
    ADD CONSTRAINT lms_quizzes_pkey PRIMARY KEY (quiz_id);


--
-- Name: lms_sections lms_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_sections
    ADD CONSTRAINT lms_sections_pkey PRIMARY KEY (section_id);


--
-- Name: lms_submissions lms_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_submissions
    ADD CONSTRAINT lms_submissions_pkey PRIMARY KEY (sub_id);


--
-- Name: lms_timetable_slots lms_timetable_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_timetable_slots
    ADD CONSTRAINT lms_timetable_slots_pkey PRIMARY KEY (slot_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: ops_grievance_comments ops_grievance_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_grievance_comments
    ADD CONSTRAINT ops_grievance_comments_pkey PRIMARY KEY (comment_id);


--
-- Name: ops_grievances ops_grievances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_grievances
    ADD CONSTRAINT ops_grievances_pkey PRIMARY KEY (ticket_id);


--
-- Name: ops_leave_documents ops_leave_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_leave_documents
    ADD CONSTRAINT ops_leave_documents_pkey PRIMARY KEY (document_id);


--
-- Name: ops_leaves ops_leaves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_leaves
    ADD CONSTRAINT ops_leaves_pkey PRIMARY KEY (leave_id);


--
-- Name: sched_constraints sched_constraints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sched_constraints
    ADD CONSTRAINT sched_constraints_pkey PRIMARY KEY (constraint_id);


--
-- Name: sis_classrooms sis_classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_classrooms
    ADD CONSTRAINT sis_classrooms_pkey PRIMARY KEY (classroom_id);


--
-- Name: sis_classrooms sis_classrooms_room_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_classrooms
    ADD CONSTRAINT sis_classrooms_room_no_key UNIQUE (room_no);


--
-- Name: sis_department_heads sis_department_heads_dept_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_department_heads
    ADD CONSTRAINT sis_department_heads_dept_id_key UNIQUE (dept_id);


--
-- Name: sis_department_heads sis_department_heads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_department_heads
    ADD CONSTRAINT sis_department_heads_pkey PRIMARY KEY (id);


--
-- Name: sis_departments sis_departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_departments
    ADD CONSTRAINT sis_departments_code_key UNIQUE (code);


--
-- Name: sis_departments sis_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_departments
    ADD CONSTRAINT sis_departments_pkey PRIMARY KEY (dept_id);


--
-- Name: sis_enrollments sis_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_enrollments
    ADD CONSTRAINT sis_enrollments_pkey PRIMARY KEY (enrollment_id);


--
-- Name: sis_faculty_availability sis_faculty_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_faculty_availability
    ADD CONSTRAINT sis_faculty_availability_pkey PRIMARY KEY (avail_id);


--
-- Name: sis_faculty sis_faculty_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_faculty
    ADD CONSTRAINT sis_faculty_employee_code_key UNIQUE (employee_code);


--
-- Name: sis_faculty sis_faculty_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_faculty
    ADD CONSTRAINT sis_faculty_pkey PRIMARY KEY (faculty_id);


--
-- Name: sis_programs sis_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_programs
    ADD CONSTRAINT sis_programs_pkey PRIMARY KEY (program_id);


--
-- Name: sis_semesters sis_semesters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_semesters
    ADD CONSTRAINT sis_semesters_pkey PRIMARY KEY (semester_id);


--
-- Name: sis_students sis_students_cnic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_students
    ADD CONSTRAINT sis_students_cnic_key UNIQUE (cnic);


--
-- Name: sis_students sis_students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_students
    ADD CONSTRAINT sis_students_pkey PRIMARY KEY (student_id);


--
-- Name: sis_students sis_students_roll_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_students
    ADD CONSTRAINT sis_students_roll_no_key UNIQUE (roll_no);


--
-- Name: sis_transcripts sis_transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_transcripts
    ADD CONSTRAINT sis_transcripts_pkey PRIMARY KEY (transcript_id);


--
-- Name: support_ticket_messages support_ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (message_id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (ticket_id);


--
-- Name: auth_user_roles uq_auth_user_roles_user_role; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_roles
    ADD CONSTRAINT uq_auth_user_roles_user_role UNIQUE (user_id, role_id);


--
-- Name: alumni_event_registrations alumni_event_registrations_alumni_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_event_registrations
    ADD CONSTRAINT alumni_event_registrations_alumni_id_fkey FOREIGN KEY (alumni_id) REFERENCES public.alumni_registry(alumni_id) ON DELETE CASCADE;


--
-- Name: alumni_event_registrations alumni_event_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_event_registrations
    ADD CONSTRAINT alumni_event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.alumni_events(event_id) ON DELETE CASCADE;


--
-- Name: alumni_events alumni_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_events
    ADD CONSTRAINT alumni_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: alumni_jobs alumni_jobs_alumni_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_jobs
    ADD CONSTRAINT alumni_jobs_alumni_id_fkey FOREIGN KEY (alumni_id) REFERENCES public.alumni_registry(alumni_id) ON DELETE CASCADE;


--
-- Name: alumni_mentorship alumni_mentorship_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_mentorship
    ADD CONSTRAINT alumni_mentorship_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.alumni_registry(alumni_id) ON DELETE CASCADE;


--
-- Name: alumni_registry alumni_registry_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_registry
    ADD CONSTRAINT alumni_registry_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: alumni_success_stories alumni_success_stories_alumni_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_success_stories
    ADD CONSTRAINT alumni_success_stories_alumni_id_fkey FOREIGN KEY (alumni_id) REFERENCES public.alumni_registry(alumni_id) ON DELETE CASCADE;


--
-- Name: auth_api_keys auth_api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_api_keys
    ADD CONSTRAINT auth_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: auth_permissions auth_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permissions
    ADD CONSTRAINT auth_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.auth_roles(role_id) ON DELETE CASCADE;


--
-- Name: auth_user_roles auth_user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_roles
    ADD CONSTRAINT auth_user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.auth_roles(role_id) ON DELETE CASCADE;


--
-- Name: auth_user_roles auth_user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_user_roles
    ADD CONSTRAINT auth_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: fin_fee_structure fin_fee_structure_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_fee_structure
    ADD CONSTRAINT fin_fee_structure_head_id_fkey FOREIGN KEY (head_id) REFERENCES public.fin_fee_heads(head_id);


--
-- Name: fin_fines fin_fines_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_fines
    ADD CONSTRAINT fin_fines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.fin_invoices(invoice_id) ON DELETE CASCADE;


--
-- Name: fin_invoice_items fin_invoice_items_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_invoice_items
    ADD CONSTRAINT fin_invoice_items_head_id_fkey FOREIGN KEY (head_id) REFERENCES public.fin_fee_heads(head_id) ON DELETE CASCADE;


--
-- Name: fin_invoice_items fin_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_invoice_items
    ADD CONSTRAINT fin_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.fin_invoices(invoice_id) ON DELETE CASCADE;


--
-- Name: fin_invoices fin_invoices_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_invoices
    ADD CONSTRAINT fin_invoices_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.sis_semesters(semester_id) ON DELETE CASCADE;


--
-- Name: fin_invoices fin_invoices_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_invoices
    ADD CONSTRAINT fin_invoices_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: fin_transactions fin_transactions_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fin_transactions
    ADD CONSTRAINT fin_transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.fin_invoices(invoice_id) ON DELETE CASCADE;


--
-- Name: hr_notifications hr_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_notifications
    ADD CONSTRAINT hr_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: lib_issues lib_issues_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_issues
    ADD CONSTRAINT lib_issues_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.lib_books(book_id) ON DELETE CASCADE;


--
-- Name: lib_issues lib_issues_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_issues
    ADD CONSTRAINT lib_issues_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: lib_librarian_profiles lib_librarian_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_librarian_profiles
    ADD CONSTRAINT lib_librarian_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: lib_reservations lib_reservations_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_reservations
    ADD CONSTRAINT lib_reservations_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.lib_books(book_id) ON DELETE CASCADE;


--
-- Name: lib_reservations lib_reservations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lib_reservations
    ADD CONSTRAINT lib_reservations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: lms_answers lms_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_answers
    ADD CONSTRAINT lms_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.lms_questions(question_id) ON DELETE CASCADE;


--
-- Name: lms_answers lms_answers_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_answers
    ADD CONSTRAINT lms_answers_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.lms_quizzes(quiz_id) ON DELETE CASCADE;


--
-- Name: lms_answers lms_answers_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_answers
    ADD CONSTRAINT lms_answers_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: lms_assignments lms_assignments_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_assignments
    ADD CONSTRAINT lms_assignments_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.lms_sections(section_id) ON DELETE CASCADE;


--
-- Name: lms_attendance lms_attendance_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_attendance
    ADD CONSTRAINT lms_attendance_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.lms_sections(section_id) ON DELETE CASCADE;


--
-- Name: lms_attendance lms_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_attendance
    ADD CONSTRAINT lms_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: lms_course_materials lms_course_materials_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_course_materials
    ADD CONSTRAINT lms_course_materials_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.lms_sections(section_id) ON DELETE CASCADE;


--
-- Name: lms_course_materials lms_course_materials_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_course_materials
    ADD CONSTRAINT lms_course_materials_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.sis_faculty(faculty_id) ON DELETE CASCADE;


--
-- Name: lms_courses lms_courses_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_courses
    ADD CONSTRAINT lms_courses_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.sis_departments(dept_id) ON DELETE CASCADE;


--
-- Name: lms_questions lms_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_questions
    ADD CONSTRAINT lms_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.lms_quizzes(quiz_id) ON DELETE CASCADE;


--
-- Name: lms_quizzes lms_quizzes_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_quizzes
    ADD CONSTRAINT lms_quizzes_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.lms_sections(section_id) ON DELETE CASCADE;


--
-- Name: lms_sections lms_sections_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_sections
    ADD CONSTRAINT lms_sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.lms_courses(course_id) ON DELETE CASCADE;


--
-- Name: lms_sections lms_sections_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_sections
    ADD CONSTRAINT lms_sections_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.sis_faculty(faculty_id) ON DELETE CASCADE;


--
-- Name: lms_sections lms_sections_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_sections
    ADD CONSTRAINT lms_sections_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.sis_semesters(semester_id) ON DELETE CASCADE;


--
-- Name: lms_submissions lms_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_submissions
    ADD CONSTRAINT lms_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.lms_assignments(assignment_id) ON DELETE CASCADE;


--
-- Name: lms_submissions lms_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_submissions
    ADD CONSTRAINT lms_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: lms_timetable_slots lms_timetable_slots_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lms_timetable_slots
    ADD CONSTRAINT lms_timetable_slots_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.lms_sections(section_id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: ops_grievance_comments ops_grievance_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_grievance_comments
    ADD CONSTRAINT ops_grievance_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: ops_grievance_comments ops_grievance_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_grievance_comments
    ADD CONSTRAINT ops_grievance_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.ops_grievances(ticket_id) ON DELETE CASCADE;


--
-- Name: ops_grievances ops_grievances_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_grievances
    ADD CONSTRAINT ops_grievances_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: ops_leave_documents ops_leave_documents_leave_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_leave_documents
    ADD CONSTRAINT ops_leave_documents_leave_id_fkey FOREIGN KEY (leave_id) REFERENCES public.ops_leaves(leave_id) ON DELETE CASCADE;


--
-- Name: ops_leaves ops_leaves_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_leaves
    ADD CONSTRAINT ops_leaves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: sis_department_heads sis_department_heads_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_department_heads
    ADD CONSTRAINT sis_department_heads_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.sis_departments(dept_id) ON DELETE CASCADE;


--
-- Name: sis_department_heads sis_department_heads_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_department_heads
    ADD CONSTRAINT sis_department_heads_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.sis_faculty(faculty_id) ON DELETE CASCADE;


--
-- Name: sis_enrollments sis_enrollments_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_enrollments
    ADD CONSTRAINT sis_enrollments_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.lms_sections(section_id) ON DELETE CASCADE;


--
-- Name: sis_enrollments sis_enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_enrollments
    ADD CONSTRAINT sis_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: sis_faculty_availability sis_faculty_availability_faculty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_faculty_availability
    ADD CONSTRAINT sis_faculty_availability_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.sis_faculty(faculty_id);


--
-- Name: sis_faculty sis_faculty_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_faculty
    ADD CONSTRAINT sis_faculty_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.sis_departments(dept_id) ON DELETE CASCADE;


--
-- Name: sis_faculty sis_faculty_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_faculty
    ADD CONSTRAINT sis_faculty_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: sis_programs sis_programs_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_programs
    ADD CONSTRAINT sis_programs_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.sis_departments(dept_id) ON DELETE CASCADE;


--
-- Name: sis_students sis_students_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_students
    ADD CONSTRAINT sis_students_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.sis_programs(program_id) ON DELETE CASCADE;


--
-- Name: sis_students sis_students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_students
    ADD CONSTRAINT sis_students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: sis_transcripts sis_transcripts_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_transcripts
    ADD CONSTRAINT sis_transcripts_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public.sis_semesters(semester_id) ON DELETE CASCADE;


--
-- Name: sis_transcripts sis_transcripts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sis_transcripts
    ADD CONSTRAINT sis_transcripts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.sis_students(student_id) ON DELETE CASCADE;


--
-- Name: support_ticket_messages support_ticket_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- Name: support_ticket_messages support_ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 0DC7b5CMt0kaIOh9ehBgHm5dW7S9oWP7YgZKdKXKe0YfMXBABiBpjpttZdMia4i

