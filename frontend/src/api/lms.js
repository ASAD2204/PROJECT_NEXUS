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

const getMySectionsInternal = async () => {
  const sectionsRes = await client.get('/lms/courses/my-courses');
  return toArray(sectionsRes.data, ['sections', 'courses']);
};

const getSectionId = (section) => section?.section_id || section?.sectionId || section?.id;

const getStudentSectionIds = async () => {
  const enrollmentsRes = await client.get('/sis/enrollments/me');
  const enrollments = toArray(enrollmentsRes.data, ['enrollments']);
  return [...new Set(enrollments.map((enrollment) => enrollment?.section_id || enrollment?.sectionId || enrollment?.id).filter(Boolean))];
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

const normalizeStudentAssignment = (assignment, section, submission) => {
  const sectionId = assignment?.section_id || assignment?.sectionId || section?.section_id || section?.sectionId || section?.id || null;
  const course = section?.course || {};
  const courseTitle =
    course.title ||
    section?.title ||
    section?.course_title ||
    assignment?.course_title ||
    assignment?.courseTitle ||
    `Section ${sectionId ?? assignment?.assignment_id ?? assignment?.id ?? ''}`.trim();
  const courseCode =
    course.code ||
    section?.code ||
    assignment?.course_code ||
    assignment?.courseCode ||
    (sectionId ? `SEC-${sectionId}` : '');
  const dueDate = assignment?.due_date || assignment?.dueDate || null;
  const submittedDate = submission?.submitted_at || submission?.submittedAt || null;
  const obtainedMarks = submission?.marks_obtained ?? submission?.marksObtained ?? null;
  const status = normalizeAssignmentStatus(assignment, submission);

  return {
    id: assignment?.assignment_id ?? assignment?.id,
    assignment_id: assignment?.assignment_id ?? assignment?.id,
    section_id: sectionId,
    sectionId,
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
});

export const lmsAPI = {
  // ── Courses ──
  getCourses: (params) => client.get('/lms/courses', { params }),
  getCourse: (id) => client.get(`/lms/courses/${id}`),
  createCourse: (data) => client.post('/lms/courses', data),
  updateCourse: (id, data) => client.put(`/lms/courses/${id}`, data),

  // ── Sections ──
  getAllSections: (params) => client.get('/lms/sections', { params }),
  getMySections: () => client.get('/lms/courses/my-courses'),
  getClassroomDetails: (sectionId) => client.get(`/lms/sections/${sectionId}/classroom`),


  // ── Assignments ──
  getAssignments: async (params = {}) => {
    const sectionId = params.section_id || params.course_id || params.sectionId || params.courseId;
    if (sectionId) {
      return client.get(`/lms/assignments/section/${sectionId}`);
    }

    const sections = await getMySectionsInternal();
    const assignmentResponses = await Promise.all(
      sections
        .map((section) => getSectionId(section))
        .filter(Boolean)
        .map((id) => client.get(`/lms/assignments/section/${id}`))
    );
    const assignments = assignmentResponses.flatMap((res) => toArray(res.data, ['assignments']));
    return { data: assignments };
  },
  getAssignment: (id) => client.get(`/lms/assignments/${id}`),
  createAssignment: (data) => client.post('/lms/assignments', data),
  updateAssignment: (id, data) => client.put(`/lms/assignments/${id}`, data),
  deleteAssignment: (id) => client.delete(`/lms/assignments/${id}`),
  getMyAssignments: async () => {
    const sectionIds = await getStudentSectionIds();
    if (!sectionIds.length) {
      return { data: { assignments: [] } };
    }

    const [assignmentResponses, sectionResponses, submissionsRes] = await Promise.all([
      Promise.all(sectionIds.map((id) => client.get(`/lms/assignments/section/${id}`).catch(() => ({ data: [] })))),
      Promise.all(sectionIds.map((id) => client.get(`/lms/sections/${id}`).catch(() => ({ data: {} })))),
      client.get('/lms/submissions/me').catch(() => ({ data: { submissions: [] } })),
    ]);

    const sectionsById = new Map(
      sectionIds.map((id, index) => [String(id), sectionResponses[index]?.data || {}])
    );
    const submissions = toArray(submissionsRes.data, ['submissions']).map(normalizeSubmission);
    const submissionByAssignmentId = new Map(
      submissions.map((submission) => [String(submission.assignment_id || submission.assignmentId), submission])
    );

    const assignments = assignmentResponses.flatMap((res, index) => {
      const sectionId = sectionIds[index];
      const section = sectionsById.get(String(sectionId)) || {};
      const rows = toArray(res.data, ['assignments']);
      return rows.map((assignment) => {
        const submission = submissionByAssignmentId.get(String(assignment.assignment_id || assignment.id));
        return normalizeStudentAssignment(assignment, section, submission);
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
  submitAssignment: (assignmentId, formData) => {
    // If formData is already a FormData object (as expected from AssignmentSubmit.jsx), 
    // we send it directly to the new multipart upload endpoint.
    if (formData instanceof FormData) {
      if (!formData.has('assignment_id')) {
        formData.append('assignment_id', assignmentId);
      }
      return client.post('/lms/submissions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    // Fallback for legacy JSON-style payload if needed
    const payload = {
      assignment_id: assignmentId,
      file_ref_id: formData?.file_ref_id || '',
      comments: formData?.comments || '',
    };
    return client.post('/lms/submissions', payload);
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
    const sectionId = params.section_id || params.course_id || params.sectionId || params.courseId;
    if (sectionId) {
      return client.get(`/lms/quizzes/section/${sectionId}`);
    }

    const sections = await getMySectionsInternal();
    const quizResponses = await Promise.all(
      sections
        .map((section) => getSectionId(section))
        .filter(Boolean)
        .map((id) => client.get(`/lms/quizzes/section/${id}`))
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
  getMaterials: (sectionId) => client.get(`/lms/materials/section/${sectionId}`),
  getCourseMaterials: (sectionId) => client.get(`/lms/materials/section/${sectionId}`),
  uploadMaterial: (courseId, formData) =>
    client.post(`/lms/materials/${courseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadCourseMaterial: (courseId, formData) =>
    client.post(`/lms/materials/${courseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Download file by file reference (compat with chat-service file URLs)
  downloadFile: async (fileRef) => {
    if (!fileRef) return Promise.reject(new Error('no file reference'));
    let path = String(fileRef);
    // strip absolute API prefix if present
    if (path.startsWith('/api/v1')) path = path.replace('/api/v1', '');
    // ensure leading slash for client (client.baseURL is /api/v1)
    if (!path.startsWith('/')) path = `/${path}`;
    return client.get(path, { responseType: 'blob' });
  },

  // ── Announcements ──
  getAnnouncements: (params) => client.get('/ops/announcements', { params }),
  getCourseAnnouncements: (courseId) => client.get('/ops/announcements', { params: { course_id: courseId } }),
  createAnnouncement: (data) => client.post('/ops/announcements', data),
  createCourseAnnouncement: (courseId, data) => client.post('/ops/announcements', { ...data, course_id: courseId }),
  likeAnnouncement: (announcementId) => client.post(`/ops/announcements/${announcementId}/like`),
  getAnnouncementComments: (announcementId) => client.get(`/ops/announcements/${announcementId}/comments`),
  createAnnouncementComment: (announcementId, data) => client.post(`/ops/announcements/${announcementId}/comments`, data),

  // ── Assignments (course-scoped) ──
  getCourseAssignments: (courseId) => client.get(`/lms/assignments/section/${courseId}`),

  // ── Feedback ──
  submitFeedback: (data) => client.post('/lms/feedback', data),
  getCourseFeedback: (courseId) => client.get(`/lms/feedback/${courseId}`),
  exportGradebook: (sectionId) => client.get(`/lms/sections/${sectionId}/grades/export`, { responseType: 'blob' }),
  exportAttendance: (sectionId) => client.get(`/lms/sections/${sectionId}/attendance/export`, { responseType: 'blob' }),
};

export default lmsAPI;
