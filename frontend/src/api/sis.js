/**
 * SIS (Student Information System) API Service
 * 
 * Calls: /sis/* endpoints — students, courses, departments, programs, faculty,
 *        enrollments, grades, sections, transcript
 */

import client from './client';

export const sisAPI = {
  // ── Students ──
  getStudents: (params) => client.get('/sis/students', { params }),
  getStudent: (id) => client.get(`/sis/students/${id}`),
  getMyProfile: () => client.get('/sis/students/me'),
  updateMyProfile: (data) => client.put('/sis/students/me', data),
  createStudent: (data) => client.post('/sis/students', data),
  updateStudent: (id, data) => client.put(`/sis/students/${id}`, data),

  // ── Courses ──
  getCourses: (params) => client.get('/lms/courses', { params }),
  getCourse: async (id) => {
    try {
      const sectionRes = await client.get(`/lms/sections/${id}`);
      const s = sectionRes.data || {};
      return {
        data: {
          ...s,
          id: s.id || s.section_id || id,
          code: s.code || s.course_code || (s.course_id ? `COURSE-${s.course_id}` : `SEC-${id}`),
          name: s.name || s.title || s.course_title || `Section ${id}`,
          title: s.title || s.name || s.course_title || `Section ${id}`,
          students: s.students || s.enrolled_students || 0,
        },
      };
    } catch {
      const coursesRes = await client.get('/lms/courses');
      const rows = coursesRes.data?.courses || coursesRes.data || [];
      const c = (Array.isArray(rows) ? rows : []).find((item) => String(item.course_id || item.id) === String(id));
      return { data: c || {} };
    }
  },
  createCourse: (data) => client.post('/lms/courses', data),
  updateCourse: (id, data) => client.put(`/lms/courses/${id}`, data),
  deleteCourse: (id) => client.delete(`/lms/courses/${id}`),

  // ── Departments ──
  getDepartments: () => client.get('/sis/departments'),
  createDepartment: (data) => client.post('/sis/departments', data),
  updateDepartment: (id, data) => client.put(`/sis/departments/${id}`, data),
  deleteDepartment: (id) => client.delete(`/sis/departments/${id}`),

  // ── Programs ──
  getPrograms: () => client.get('/sis/programs'),
  createProgram: (data) => client.post('/sis/programs', data),
  updateProgram: (id, data) => client.put(`/sis/programs/${id}`, data),
  deleteProgram: (id) => client.delete(`/sis/programs/${id}`),

  // ── Faculty ──
  getFaculty: (params) => client.get('/sis/faculty', { params }),
  getFacultyMember: (id) => client.get(`/sis/faculty/${id}`),

  // ── Enrollments ──
  getMyEnrollments: () => client.get('/sis/enrollments/me'),
  getMyCourses: () => client.get('/lms/courses/my-courses'),
  enrollStudent: (data) => client.post('/sis/enrollments', data),

  // ── Grades ──
  getMyGrades: () => client.get('/sis/transcripts/me'),
  submitGrade: (data) => client.post('/lms/grades/submit', data),

  // ── Transcript ──
  getTranscript: () => client.get('/sis/transcripts/me'),
  getMyTranscript: () => client.get('/sis/transcripts/me'),

  // ── Sections ──
  getSections: () => client.get('/lms/courses/my-courses'),
  createSection: (data) => client.post('/lms/sections', data),

  // ── Leaderboard ──
  getLeaderboard: (params) => {
    const programId = params?.program_id || params?.programId;
    const semesterId = params?.semester_id || params?.semesterId;
    if (!programId || !semesterId) {
      return Promise.reject(new Error('program_id and semester_id are required for leaderboard.'));
    }
    return client.get(`/sis/leaderboard/${programId}/${semesterId}`, {
      params: params?.top ? { top: params.top } : undefined,
    });
  },
};

export default sisAPI;
