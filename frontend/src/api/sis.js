/**
 * SIS (Student Information System) API Service
 * 
 * Calls: /sis/* endpoints — students, courses, departments, programs, faculty,
 *        enrollments, grades, transcript
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
  getMyTeachers: () => client.get('/sis/students/me/teachers'),

  // ── Courses ──
  getCourses: (params) => client.get('/lms/courses', { params }),
  getCoursesAdmin: (params) => client.get('/lms/courses/admin/list', { params }),
  getCourse: (id) => client.get(`/lms/courses/${id}`),
  createCourse: (data) => client.post('/lms/courses', data),
  updateCourse: (id, data) => client.put(`/lms/courses/${id}`, data),
  deleteCourse: (id) => client.delete(`/lms/courses/${id}`),

  // ── Semesters ──
  getSemesters: () => client.get('/sis/semesters'),

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
  enrollAllInProgram: (id) => client.post(`/sis/programs/${id}/enroll-all`),

  // ── Faculty ──
  getFaculty: (params) => client.get('/sis/faculty', { params }),
  getFacultyMember: (id) => client.get(`/sis/faculty/${id}`),
  getMyAvailability: () => client.get('/sis/faculty/me/availability'),
  addAvailability: (data) => client.post('/sis/faculty/me/availability', data),
  removeAvailability: (id) => client.delete(`/sis/faculty/me/availability/${id}`),

  // ── Enrollments ──
  getMyEnrollments: () => client.get('/sis/enrollments/me'),
  getMyCourses: () => client.get('/lms/courses/my-courses'),
  getCourseParticipants: (courseId) => client.get(`/sis/courses/${courseId}/participants`),
  enrollStudent: (data) => client.post('/sis/enrollments', data),

  // ── Grades ──
  getMyGrades: () => client.get('/sis/transcripts/me'),
  submitGrade: (data) => client.post('/lms/grades/submit', data),

  // ── Transcript ──
  getTranscript: () => client.get('/sis/transcripts/me'),
  getMyTranscript: () => client.get('/sis/transcripts/me'),

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
