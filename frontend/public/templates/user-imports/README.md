# User Import Templates

Use these templates with the Admin > User Management > Import flow.

Accepted file types:
- `.csv`
- `.json`

Required/common columns:
- `full_name`
- `email`
- `role`

Role-specific columns:
- Student: `roll_no`, `current_semester`, `department`, `program`, `session`, `password`
- Faculty: `employee_code`, `department`, `designation`, `specialization`, `type`, `password`
- Librarian: `employee_code`, `department`, `qualification`, `experience`, `password`
- Admin: `password`

Transfer / old-student template:
- Use `transfer-student-template.csv` for adding a student who joins at semester 5, 6, 7, or 8.
- Use `transfer-student-history.json` when you also want to keep prior semester course history.
- Include `total_credit_hours_completed` and `current_cgpa` for transcript continuity.
- The nested `academic_history` array is for record keeping and should contain per-course details such as semester, course code, credit hours, marks, grade, and grade points.

Notes:
- `department` and `program` can be a name/code or an ID.
- `role` must be one of `student`, `faculty`, `librarian`, `admin`.
- `teacher` is also accepted and will be normalized to `faculty`.
- If `password` is omitted, the import flow falls back to `TempPass@123`.
- For older students, set `current_semester` to the semester they are currently in, for example `5`.
- For transfer students, keep the profile import and transcript history together so their old credit hours and CGPA are not lost.

Teacher demo (quick):

- **Import transfer history**: POST the `transfer-student-history.json` payload to the SIS endpoint to create enrollments and transcripts.

```bash
curl -X POST \
	-H "Content-Type: application/json" \
	-d @transfer-student-history.json \
	http://localhost:8000/sis/students/123/import-history
```

- **Promote a student to next semester** (for demonstration):

```bash
curl -X POST http://localhost:8000/sis/students/123/promote
```

- **How CGPA is computed here**: the service computes SGPA per semester as the average of final grade points for graded enrollments in that semester, then computes CGPA as the simple average of all semester SGPAs (this mirrors the service's existing consumer logic). For teacher demonstrations you can:
	- Import a transfer student's prior semesters (creates transcripts).
	- Show `GET /sis/transcripts/{student_id}` to display semester SGPA and CGPA.
	- Use `POST /sis/students/{student_id}/promote` to advance semester and explain how new semester SGPA/C GPA will appear after grades are added.

Note: the import endpoint expects course codes or course IDs that match the LMS catalog; rows with unresolved courses are skipped and reported in the response.
