import psycopg2

try:
    conn = psycopg2.connect(
        dbname="nexus_db",
        user="nexus_user",
        password="nexus_pass",
        host="postgres",
        port="5432"
    )
    cursor = conn.cursor()
    
    # 1. Fetch all students
    cursor.execute("""
        SELECT s.student_id, u.email, u.first_name, u.last_name, s.roll_no, s.current_semester, s.current_risk_status, s.is_graduated
        FROM sis_students s
        JOIN auth_users u ON s.user_id = u.user_id;
    """)
    students = cursor.fetchall()
    print("=== Students registered in the system ===")
    for s in students:
        print(f"ID: {s[0]} | Email: {s[1]} | Name: {s[2]} {s[3]} | Roll: {s[4]} | Sem: {s[5]} | Risk: {s[6]} | Graduated: {s[7]}")
    
    # 2. Fetch all semesters
    cursor.execute("SELECT semester_id, title, status, is_active FROM sis_semesters;")
    semesters = cursor.fetchall()
    print("\n=== Semesters ===")
    for sem in semesters:
        print(f"ID: {sem[0]} | Title: {sem[1]} | Status: {sem[2]} | Active: {sem[3]}")
        
    # 3. Fetch transcripts count per student
    cursor.execute("""
        SELECT student_id, COUNT(*), AVG(sgpa), MAX(cgpa)
        FROM sis_transcripts
        GROUP BY student_id;
    """)
    transcripts = cursor.fetchall()
    print("\n=== Transcript Stats ===")
    for t in transcripts:
        print(f"StudentID: {t[0]} | Total Semesters: {t[1]} | Avg SGPA: {t[2]} | Max CGPA: {t[3]}")

    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
