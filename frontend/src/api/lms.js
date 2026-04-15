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

const getSections = async () => {
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

  // ── Assignments ──
  getAssignments: async (params = {}) => {
    const sectionId = params.section_id || params.course_id || params.sectionId || params.courseId;
    if (sectionId) {
      return client.get(`/lms/assignments/section/${sectionId}`);
    }

    const sections = await getSections();
    const assignmentResponses = await Promise.all(
      sections
        .map((section) => getSectionId(section))
        .filter(Boolean)
        .map((id) => client.get(`/lms/assignments/section/${id}`))
    );
    const assignments = assignmentResponses.flatMap((res) => toArray(res.data, ['assignments']));
    return { data: assignments };
  },
  getAssignment: async (id) => {
    const all = await lmsAPI.getMyAssignments();
    const assignment = toArray(all.data, ['assignments']).find(
      (item) => String(item.assignment_id || item.id) === String(id)
    );
    if (!assignment) {
      throw new Error('Assignment not found');
    }
    return { data: assignment };
  },
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
    const payload = {
      assignment_id: assignmentId,
      file_ref_id: formData?.get ? (formData.get('file_ref_id') || formData.get('file') || formData.get('attachment') || '') : '',
    };
    return client.post('/lms/submissions', payload);
  },
  getSubmissions: (assignmentId) => client.get(`/lms/submissions/assignment/${assignmentId}`),
  getMySubmissions: async () => {
    const assignmentsRes = await lmsAPI.getMyAssignments();
    const assignments = toArray(assignmentsRes.data, ['assignments']);
    const submissionResponses = await Promise.all(
      assignments
        .map((item) => item.assignment_id || item.id)
        .filter(Boolean)
        .map((id) => client.get(`/lms/submissions/assignment/${id}`))
    );
    const submissions = submissionResponses.flatMap((res) => toArray(res.data, ['submissions']));
    return { data: { submissions } };
  },
  gradeSubmission: (submissionId, data) =>
    client.put(`/lms/submissions/${submissionId}/grade`, data),

  // ── Quizzes ──
  getQuizzes: async (params = {}) => {
    const sectionId = params.section_id || params.course_id || params.sectionId || params.courseId;
    if (sectionId) {
      return client.get(`/lms/quizzes/section/${sectionId}`);
    }

    const sections = await getSections();
    const quizResponses = await Promise.all(
      sections
        .map((section) => getSectionId(section))
        .filter(Boolean)
        .map((id) => client.get(`/lms/quizzes/section/${id}`))
    );
    const quizzes = quizResponses.flatMap((res) => toArray(res.data, ['quizzes']));
    return { data: { quizzes } };
  },
  getQuiz: async (id) => {
    const quizzesRes = await lmsAPI.getQuizzes();
    const quizzes = toArray(quizzesRes.data, ['quizzes']);
    const quiz = quizzes.find((item) => String(item.quiz_id || item.id) === String(id));
    if (!quiz) {
      throw new Error('Quiz not found');
    }
    return { data: quiz };
  },
  createQuiz: (data) => client.post('/lms/quizzes', data),
  updateQuiz: (id, data) => client.put(`/lms/quizzes/${id}`, data),
  deleteQuiz: (id) => client.delete(`/lms/quizzes/${id}`),
  submitQuiz: (id, data) => client.post(`/lms/quizzes/${id}/attempt`, data),

  // ── Course Materials ──
  getMaterials: (courseId) => client.get(`/lms/materials/course/${courseId}`),
  getCourseMaterials: (courseId) => client.get(`/lms/materials/course/${courseId}`),
  uploadMaterial: (courseId, formData) =>
    client.post(`/lms/materials/${courseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ── Announcements ──
  getAnnouncements: (params) => client.get('/ops/announcements', { params }),
  getCourseAnnouncements: (courseId) => client.get('/ops/announcements', { params: { course_id: courseId } }),
  createAnnouncement: (data) => client.post('/ops/announcements', data),

  // ── Assignments (course-scoped) ──
  getCourseAssignments: (courseId) => client.get(`/lms/assignments/section/${courseId}`),

  // ── Feedback ──
  submitFeedback: (data) => client.post('/lms/feedback', data),
  getCourseFeedback: (courseId) => client.get(`/lms/feedback/${courseId}`),
};

export default lmsAPI;
