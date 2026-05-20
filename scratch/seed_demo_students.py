import uuid
import psycopg2
from psycopg2.extras import RealDictCursor

# Password hash for 'password123'
DEFAULT_HASH = '$2b$12$XGeuwXg0H8zV9TCng0Lfc.XjmH/ieuSyRWVYtr8/FpVMvup4cLx7a'

SEMESTER_NAMES = [
    "FIRST SEMESTER",
    "SECOND SEMESTER",
    "THIRD SEMESTER",
    "FOURTH SEMESTER",
    "FIFTH SEMESTER",
    "SIXTH SEMESTER",
    "SEVENTH SEMESTER",
    "EIGHTH SEMESTER"
]

# Courses per semester (realistic BS IT curriculum)
COURSES_DATA = {
    1: [
        {"code": "ICT-101", "title": "Introduction to ICT", "credits": 3},
        {"code": "PF-102", "title": "Programming Fundamentals", "credits": 4},
        {"code": "MATH-103", "title": "Calculus & Analytical Geometry", "credits": 3},
        {"code": "ENG-104", "title": "English Composition", "credits": 3},
        {"code": "PAK-105", "title": "Pakistan Studies", "credits": 2}
    ],
    2: [
        {"code": "OOP-201", "title": "Object-Oriented Programming", "credits": 4},
        {"code": "DS-202", "title": "Discrete Structures", "credits": 3},
        {"code": "STATS-203", "title": "Probability & Statistics", "credits": 3},
        {"code": "ENG-204", "title": "Communication Skills", "credits": 3},
        {"code": "IS-205", "title": "Islamic Studies", "credits": 2}
    ],
    3: [
        {"code": "DSA-301", "title": "Data Structures & Algorithms", "credits": 4},
        {"code": "COAL-302", "title": "Computer Org. & Assembly Lang.", "credits": 4},
        {"code": "MATH-303", "title": "Linear Algebra", "credits": 3},
        {"code": "ENG-304", "title": "Technical Writing", "credits": 3}
    ],
    4: [
        {"code": "DB-401", "title": "Database Systems", "credits": 4},
        {"code": "SE-402", "title": "Software Engineering", "credits": 3},
        {"code": "OS-403", "title": "Operating Systems", "credits": 4},
        {"code": "MATH-404", "title": "Numerical Analysis", "credits": 3}
    ],
    5: [
        {"code": "CN-501", "title": "Computer Networks", "credits": 4},
        {"code": "WEB-502", "title": "Web Technologies", "credits": 3},
        {"code": "ITM-503", "title": "IT Project Management", "credits": 3},
        {"code": "PSY-504", "title": "Organizational Psychology", "credits": 3}
    ],
    6: [
        {"code": "AI-601", "title": "Artificial Intelligence", "credits": 4},
        {"code": "INFOSEC-602", "title": "Information Security", "credits": 3},
        {"code": "HCI-603", "title": "Human Computer Interaction", "credits": 3},
        {"code": "ENT-604", "title": "Entrepreneurship", "credits": 3}
    ],
    7: [
        {"code": "MAD-701", "title": "Mobile App Development", "credits": 3},
        {"code": "PROF-702", "title": "Professional Practices", "credits": 3},
        {"code": "FYP-703", "title": "Capstone Project - I", "credits": 3},
        {"code": "CLOUD-704", "title": "Cloud Computing", "credits": 3}
    ],
    8: [
        {"code": "FYP-801", "title": "Capstone Project - II", "credits": 3},
        {"code": "DS-802", "title": "Distributed Systems", "credits": 3},
        {"code": "BDA-803", "title": "Big Data Analytics", "credits": 3},
        {"code": "MGMT-804", "title": "Strategic Management", "credits": 3}
    ]
}

def seed_demo_students():
    try:
        conn = psycopg2.connect(
            dbname="nexus_db",
            user="nexus_user",
            password="nexus_pass",
            host="postgres",
            port="5432"
        )
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        print("Connected to PostgreSQL successfully.")
        
        # 1. Fetch IT Department and BS IT Program
        cursor.execute("SELECT dept_id FROM sis_departments WHERE code = 'IT';")
        dept = cursor.fetchone()
        if not dept:
            print("IT department not found! Make sure to run general seed script first.")
            return
        dept_id = dept['dept_id']
        
        cursor.execute("SELECT program_id FROM sis_programs WHERE dept_id = %s LIMIT 1;", (dept_id,))
        prog = cursor.fetchone()
        if not prog:
            print("BS IT Program not found!")
            return
        program_id = prog['program_id']
        
        # 2. Get Student Role ID
        cursor.execute("SELECT role_id FROM auth_roles WHERE role_name = 'student';")
        role = cursor.fetchone()
        if not role:
            print("Student role not found!")
            return
        student_role_id = role['role_id']
        
        # 3. Ensure all 8 semesters exist in the database
        semester_ids = {}
        for idx, sem_name in enumerate(SEMESTER_NAMES, 1):
            cursor.execute("SELECT semester_id FROM sis_semesters WHERE title = %s;", (sem_name,))
            sem = cursor.fetchone()
            if sem:
                semester_ids[idx] = sem['semester_id']
            else:
                cursor.execute("""
                    INSERT INTO sis_semesters (title, start_date, end_date, is_active, status)
                    VALUES (%s, NOW() - INTERVAL '%s month', NOW() + INTERVAL '%s month', %s, 'Completed')
                    RETURNING semester_id;
                """, (sem_name, (8 - idx) * 6, (9 - idx) * 6, (idx == 8))) # Keep 8th active
                new_sem = cursor.fetchone()
                semester_ids[idx] = new_sem['semester_id']
                print(f"Created Semester: {sem_name} (ID: {semester_ids[idx]})")

        # 4. Ensure all courses exist in lms_courses
        course_ids = {} # (sem_idx, code) -> course_id
        for sem_idx, courses in COURSES_DATA.items():
            sem_db_id = semester_ids[sem_idx]
            for c in courses:
                cursor.execute("SELECT course_id FROM lms_courses WHERE code = %s;", (c['code'],))
                course_db = cursor.fetchone()
                if course_db:
                    course_ids[(sem_idx, c['code'])] = course_db['course_id']
                else:
                    cursor.execute("""
                        INSERT INTO lms_courses (dept_id, program_id, semester_id, code, title, credit_hours, capacity)
                        VALUES (%s, %s, %s, %s, %s, %s, 50)
                        RETURNING course_id;
                    """, (dept_id, program_id, sem_db_id, c['code'], c['title'], c['credits']))
                    new_course = cursor.fetchone()
                    course_ids[(sem_idx, c['code'])] = new_course['course_id']
                    print(f"Created Course: {c['code']} - {c['title']} (Sem {sem_idx})")

        # 5. Define Demo Students
        demo_students = [
            {
                "email": "student5@nexus.edu",
                "first_name": "Zainab",
                "last_name": "Fatima",
                "roll_no": "BIT24001",
                "cnic": "35202-5000005-5",
                "current_semester": 5,
                "completed_semesters": 4,
                "history_gpa": {1: 3.4, 2: 3.2, 3: 3.5, 4: 3.6}
            },
            {
                "email": "student8@nexus.edu",
                "first_name": "Bilal",
                "last_name": "Siddiqui",
                "roll_no": "BIT22001",
                "cnic": "35202-8000008-8",
                "current_semester": 8,
                "completed_semesters": 7,
                "history_gpa": {1: 3.1, 2: 3.0, 3: 3.2, 4: 3.4, 5: 3.3, 6: 3.6, 7: 3.7}
            }
        ]

        for s in demo_students:
            print(f"\nSeeding student: {s['email']} ({s['first_name']} {s['last_name']})")
            
            # Check if user already exists
            cursor.execute("SELECT user_id FROM auth_users WHERE email = %s;", (s['email'],))
            user = cursor.fetchone()
            if user:
                user_id = user['user_id']
                print(f"User already exists with ID: {user_id}")
            else:
                user_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO auth_users (user_id, email, password_hash, first_name, last_name, phone, is_active)
                    VALUES (%s, %s, %s, %s, %s, '03001234567', TRUE);
                """, (user_id, s['email'], DEFAULT_HASH, s['first_name'], s['last_name']))
                
                # Assign Student Role
                cursor.execute("""
                    INSERT INTO auth_user_roles (user_id, role_id)
                    VALUES (%s, %s);
                """, (user_id, student_role_id))
                print(f"Created new AuthUser and Role Mapping: {user_id}")

            # Check if SIS profile already exists
            cursor.execute("SELECT student_id FROM sis_students WHERE user_id = %s;", (user_id,))
            student_db = cursor.fetchone()
            if student_db:
                student_id = student_db['student_id']
                cursor.execute("""
                    UPDATE sis_students 
                    SET current_semester = %s, program_id = %s, roll_no = %s, current_risk_status = 'Green', cnic = %s
                    WHERE student_id = %s;
                """, (s['current_semester'], program_id, s['roll_no'], s['cnic'], student_id))
                print(f"Updated existing SIS student profile (ID: {student_id})")
            else:
                cursor.execute("""
                    INSERT INTO sis_students (user_id, program_id, roll_no, cnic, current_semester, current_risk_status, blood_group, guardian_name)
                    VALUES (%s, %s, %s, %s, %s, 'Green', 'B+', 'Siddiqui Ahmed')
                    RETURNING student_id;
                """, (user_id, program_id, s['roll_no'], s['cnic'], s['current_semester']))
                new_student = cursor.fetchone()
                student_id = new_student['student_id']
                print(f"Created new SIS student profile (ID: {student_id})")

            # Clean existing transcripts and enrollments to avoid duplicates
            cursor.execute("DELETE FROM sis_transcripts WHERE student_id = %s;", (student_id,))
            cursor.execute("DELETE FROM sis_enrollments WHERE student_id = %s;", (student_id,))
            cursor.execute("DELETE FROM fin_invoices WHERE student_id = %s;", (student_id,))
            print("Cleared historical transcript, enrollment, and invoice records for clean seed.")

            # Seed completed semesters history
            cumulative_qp = 0.0
            cumulative_credits = 0.0

            for sem_idx in range(1, s['completed_semesters'] + 1):
                sem_db_id = semester_ids[sem_idx]
                target_gpa = s['history_gpa'][sem_idx]
                courses = COURSES_DATA[sem_idx]
                
                # Calculate GP for courses to sum up to target GPA
                # QP = target_gpa * total_credits
                total_credits = sum(c['credits'] for c in courses)
                target_qp = target_gpa * total_credits
                
                # Distribute target_qp across courses
                avg_gp = target_qp / len(courses)
                
                sem_qp = 0.0
                sem_credits = 0.0
                
                for c in courses:
                    course_db_id = course_ids[(sem_idx, c['code'])]
                    gp = round(avg_gp / c['credits'], 2) if c['credits'] > 0 else 3.0
                    gp = max(0.0, min(4.0, gp)) # clamp
                    
                    # Insert historical completed enrollment
                    cursor.execute("""
                        INSERT INTO sis_enrollments (student_id, course_id, status, is_historical, midterm_marks, finalterm_marks, sessional_marks, final_grade_points)
                        VALUES (%s, %s, 'Completed', TRUE, %s, %s, %s, %s);
                    """, (student_id, course_db_id, gp * 10, gp * 20, gp * 10, gp))
                    
                    sem_qp += gp * c['credits']
                    sem_credits += c['credits']
                
                actual_sgpa = round(sem_qp / sem_credits, 2)
                cumulative_qp += sem_qp
                cumulative_credits += sem_credits
                actual_cgpa = round(cumulative_qp / cumulative_credits, 2)

                # Insert Completed Transcript
                cursor.execute("""
                    INSERT INTO sis_transcripts (student_id, semester_id, sgpa, cgpa)
                    VALUES (%s, %s, %s, %s);
                """, (student_id, sem_db_id, actual_sgpa, actual_cgpa))
                print(f" -> Seeded Semester {sem_idx} ({SEMESTER_NAMES[sem_idx-1]}): SGPA: {actual_sgpa} | CGPA: {actual_cgpa} | Credits: {sem_credits}")

            # Also seed enrollments for current active semester (as "Enrolled")
            current_sem_idx = s['current_semester']
            current_sem_db_id = semester_ids[current_sem_idx]
            current_courses = COURSES_DATA[current_sem_idx]
            for c in current_courses:
                course_db_id = course_ids[(current_sem_idx, c['code'])]
                cursor.execute("""
                    INSERT INTO sis_enrollments (student_id, course_id, status, is_historical)
                    VALUES (%s, %s, 'Enrolled', FALSE);
                """, (student_id, course_db_id))
            print(f" -> Registered {len(current_courses)} active courses for current Semester {current_sem_idx}")

            # 6. Seed Invoices as 'Paid' so transcripts are unlocked
            for sem_idx in range(1, s['current_semester'] + 1):
                sem_db_id = semester_ids[sem_idx]
                cursor.execute("""
                    INSERT INTO fin_invoices (student_id, semester_id, total_amount, due_date, status)
                    VALUES (%s, %s, 60000.00, NOW() - INTERVAL '1 month', 'Paid');
                """, (student_id, sem_db_id))
            print(f" -> Generated and marked {s['current_semester']} semesters of tuition invoices as PAID.")

        conn.commit()
        cursor.close()
        conn.close()
        print("\nDemo students seeded successfully and all transactions committed!")
        return True
    except Exception as e:
        print("Seeding failed with error:", e)
        return False

if __name__ == '__main__':
    seed_demo_students()
