/**
 * LMS (Learning Management System) API Service
 * 
 * Calls: /lms/* endpoints — courses, assignments, quizzes, submissions,
 *        materials, announcements, feedback
 */

import client from './client';

const toArray = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const getMyCoursesInternal = async () => {
  const res = await client.get('/lms/courses/my-courses');
  return toArray(res.data, ['courses']);
};

const getCourseId = (course) => course?.course_id || course?.courseId || course?.id;

const getStudentCourseIds = async () => {
  const enrollmentsRes = await client.get('/sis/enrollments/me');
  const enrollments = toArray(enrollmentsRes.data, ['enrollments']);
  return [...new Set(enrollments.map((enrollment) => enrollment?.course_id || enrollment?.courseId || enrollment?.id).filter(Boolean))];
};

const normalizeAssignmentStatus = (assignment, submission) => {
  const dueDate = assignment?.due_date || assignment?.dueDate;
  const hasMarks = submission?.marks_obtained !== undefined && submission?.marks_obtained !== null
    ? submission.marks_obtained
    : submission?.marksObtained;

  if (hasMarks !== undefined && hasMarks !== null) return 'Graded';
  if (submission) return 'Submitted';
  if (dueDate && new Date(dueDate) < new Date()) return 'Overdue';
  return 'Pending';
};

const normalizeStudentAssignment = (assignment, course, submission) => {
  const courseId = assignment?.course_id || assignment?.courseId || course?.course_id || course?.courseId || course?.id || null;
  const courseTitle =
    course?.title ||
    assignment?.course_title ||
    assignment?.courseTitle ||
    `Course ${courseId ?? assignment?.assignment_id ?? assignment?.id ?? ''}`.trim();
  const courseCode =
    course?.code ||
    assignment?.course_code ||
    assignment?.courseCode ||
    (courseId ? `C-${courseId}` : '');
  const dueDate = assignment?.due_date || assignment?.dueDate || null;
  const submittedDate = submission?.submitted_at || submission?.submittedAt || null;
  const obtainedMarks = submission?.marks_obtained ?? submission?.marksObtained ?? null;
  const status = normalizeAssignmentStatus(assignment, submission);

  return {
    id: assignment?.assignment_id ?? assignment?.id,
    assignment_id: assignment?.assignment_id ?? assignment?.id,
    course_id: courseId,
    courseId,
    title: assignment?.title || 'Untitled Assignment',
    description: assignment?.description || '',
    total_marks: assignment?.total_marks ?? assignment?.totalMarks ?? 0,
    totalMarks: assignment?.total_marks ?? assignment?.totalMarks ?? 0,
    due_date: dueDate,
    dueDate,
    submitted_on: submittedDate,
    submittedOn: submittedDate,
    submitted_at: submittedDate,
    submittedAt: submittedDate,
    status,
    course: courseTitle,
    course_title: courseTitle,
    courseTitle,
    course_code: courseCode,
    courseCode,
    obtained_marks: obtainedMarks,
    obtainedMarks,
    attachment_ref_id: assignment?.attachment_ref_id || assignment?.attachmentRefId || null,
    attachmentRefId: assignment?.attachment_ref_id || assignment?.attachmentRefId || null,
    created_at: submittedDate || dueDate || null,
    updated_at: submittedDate || dueDate || null,
  };
};

const normalizeSubmission = (submission) => ({
  ...submission,
  id: submission?.sub_id ?? submission?.id,
  submission_id: submission?.sub_id ?? submission?.id,
  sub_id: submission?.sub_id ?? submission?.id,
  submitted_at: submission?.submitted_at || submission?.submittedAt || null,
  submittedAt: submission?.submitted_at || submission?.submittedAt || null,
  marks_obtained: submission?.marks_obtained ?? submission?.marksObtained ?? null,
  marksObtained: submission?.marks_obtained ?? submission?.marksObtained ?? null,
  status: submission?.status || (submission?.marks_obtained !== null ? 'graded' : 'pending'),
});

export const lmsAPI = {
  // ── Courses ──
  getCourses: (params) => client.get('/lms/courses', { params }),
  getCoursesAdmin: (params) => client.get('/lms/courses/admin/list', { params }),
  getCourse: (id) => client.get(`/lms/courses/${id}`),
  createCourse: (data) => client.post('/lms/courses', data),
  updateCourse: (id, data) => client.put(`/lms/courses/${id}`, data),
  deleteCourse: (id) => client.delete(`/lms/courses/${id}`),
  getMyCourses: () => client.get('/lms/courses/my-courses'),
  getClassroomDetails: (courseId) => client.get(`/lms/courses/${courseId}/classroom`),

  // ── Assignments ──
  getAssignments: async (params = {}) => {
    const courseId = params.course_id || params.courseId || params.id;
    if (courseId) {
      return client.get(`/lms/assignments/course/${courseId}`);
    }

    const courses = await getMyCoursesInternal();
    const assignmentResponses = await Promise.all(
      courses
        .map((c) => getCourseId(c))
        .filter(Boolean)
        .map((id) => client.get(`/lms/assignments/course/${id}`))
    );
    const assignments = assignmentResponses.flatMap((res) => toArray(res.data, ['assignments']));
    return { data: assignments };
  },
  getCourseAssignments: (courseId) => client.get(`/lms/assignments/course/${courseId}`),
  getAssignment: (id) => client.get(`/lms/assignments/${id}`),
  createAssignment: (data) => client.post('/lms/assignments', data),
  updateAssignment: (id, data) => client.put(`/lms/assignments/${id}`, data),
  deleteAssignment: (id) => client.delete(`/lms/assignments/${id}`),
  
  getMyAssignments: async () => {
    const courseIds = await getStudentCourseIds();
    if (!courseIds.length) {
      return { data: { assignments: [] } };
    }

    const [assignmentResponses, courseResponses, submissionsRes] = await Promise.all([
      Promise.all(courseIds.map((id) => client.get(`/lms/assignments/course/${id}`).catch(() => ({ data: [] })))),
      Promise.all(courseIds.map((id) => client.get(`/lms/courses/${id}`).catch(() => ({ data: {} })))),
      client.get('/lms/submissions/me').catch(() => ({ data: { submissions: [] } })),
    ]);

    const coursesById = new Map(
      courseIds.map((id, index) => [String(id), courseResponses[index]?.data || {}])
    );
    const submissions = toArray(submissionsRes.data, ['submissions']).map(normalizeSubmission);
    const submissionByAssignmentId = new Map(
      submissions.map((submission) => [String(submission.assignment_id || submission.assignmentId), submission])
    );

    const assignments = assignmentResponses.flatMap((res, index) => {
      const courseId = courseIds[index];
      const course = coursesById.get(String(courseId)) || {};
      const rows = toArray(res.data, ['assignments']);
      return rows.map((assignment) => {
        const submission = submissionByAssignmentId.get(String(assignment.assignment_id || assignment.id));
        return normalizeStudentAssignment(assignment, course, submission);
      });
    });

    return { data: { assignments } };
  },

  getMySubmissions: async () => {
    const res = await client.get('/lms/submissions/me');
    const submissions = toArray(res.data, ['submissions']).map(normalizeSubmission);
    return { data: { submissions } };
  },

  // ── Submissions ──
  submitAssignment: (assignmentId, payload) => {
    // If payload is FormData, we shouldn't wrap it in a plain object
    if (payload instanceof FormData) {
      if (!payload.has('assignment_id')) {
        payload.append('assignment_id', assignmentId);
      }
      return client.post('/lms/submissions', payload);
    }
    return client.post('/lms/submissions', {
      assignment_id: assignmentId,
      ...payload
    });
  },
  getSubmissions: async (id, options = {}) => {
    if (options.type === 'quiz') {
      const res = await client.get(`/lms/quizzes/${id}/attempts`);
      const attempts = toArray(res.data).map((att) => ({
        ...att,
        id: `${att.quiz_id}_${att.student_id}`,
        studentId: att.student_id,
        studentName: att.student_name,
        submittedDate: att.submitted_at,
        marksObtained: att.total_score,
        status: 'graded',
      }));
      return { data: attempts };
    }
    const res = await client.get(`/lms/submissions/assignment/${id}`);
    const submissions = toArray(res.data, ['submissions']).map(normalizeSubmission);
    return { data: submissions };
  },
  gradeSubmission: (submissionId, data) =>
    client.put(`/lms/submissions/${submissionId}/grade`, data),

  // ── Quizzes ──
  getQuizzes: async (params = {}) => {
    const courseId = params.course_id || params.courseId || params.id;
    if (courseId) {
      return client.get(`/lms/quizzes/course/${courseId}`);
    }

    const courses = await getMyCoursesInternal();
    const quizResponses = await Promise.all(
      courses
        .map((c) => getCourseId(c))
        .filter(Boolean)
        .map((id) => client.get(`/lms/quizzes/course/${id}`))
    );
    const quizzes = quizResponses.flatMap((res) => toArray(res.data, ['quizzes']));
    return { data: { quizzes } };
  },
  getQuiz: (id) => client.get(`/lms/quizzes/${id}`),
  getQuizAttemptStatus: (id) => client.get(`/lms/quizzes/${id}/attempt-status/me`),
  createQuiz: (data) => client.post('/lms/quizzes', data),
  updateQuiz: (id, data) => client.put(`/lms/quizzes/${id}`, data),
  deleteQuiz: (id) => client.delete(`/lms/quizzes/${id}`),
  submitQuiz: (id, data) => client.post(`/lms/quizzes/${id}/attempt`, data),

  // ── Course Materials ──
  getMaterials: (courseId) => client.get(`/lms/materials/course/${courseId}`),
  getCourseMaterials: (courseId) => client.get(`/lms/materials/course/${courseId}`),
  uploadMaterial: (payload) => client.post('/lms/materials', payload),
  downloadFile: (id) => client.get(`/lms/materials/download/${id}`, { responseType: 'blob' }),

  // ── Announcements ──
  getAnnouncements: (params) => client.get('/ops/announcements', { params }),
  getCourseAnnouncements: (courseId) => client.get('/ops/announcements', { params: { course_id: courseId } }),
  createAnnouncement: (data) => client.post('/ops/announcements', data),
  createCourseAnnouncement: (courseId, data) => client.post('/ops/announcements', { ...data, course_id: courseId }),
  likeAnnouncement: (announcementId) => client.post(`/ops/announcements/${announcementId}/like`),
  getAnnouncementComments: (announcementId) => client.get(`/ops/announcements/${announcementId}/comments`),
  createAnnouncementComment: (announcementId, data) => client.post(`/ops/announcements/${announcementId}/comments`, data),

  // ── Feedback ──
  submitFeedback: (data) => client.post('/lms/feedback', data),
  getCourseFeedback: (courseId) => client.get(`/lms/feedback/course/${courseId}`),
  exportGradebook: (courseId) => client.get(`/lms/courses/${courseId}/grades/export`, { responseType: 'blob' }),
  exportAttendance: (courseId) => client.get(`/lms/courses/${courseId}/attendance/export`, { responseType: 'blob' }),
  
  // ── Materials ──
  deleteMaterial: (id) => client.delete(`/lms/materials/${id}`),
  updateMaterial: (id, data) => client.put(`/lms/materials/${id}`, data),
  
  // ── Grades ──
  getGradebookData: (courseId) => client.get(`/lms/courses/${courseId}/gradebook-data`),
  finalizeResults: (courseId) => client.post(`/lms/courses/${courseId}/finalize`),
  submitGrades: (data) => client.post('/lms/grades/submit', data),
};

export default lmsAPI;
