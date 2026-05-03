/**
 * Teacher API Service
 * 
 * Calls: /sis/*, /lms/*, /attendance/*, /hr/* endpoints for teacher-specific operations
 * Routes are faculty/teacher specific with proper authorization
 */

import client from './client';

export const teacherAPI = {
  // ── Faculty Profile ──
  getProfile: () => client.get('/sis/faculty/me'),
  updateProfile: (data) => client.put('/sis/faculty/me', data),

  // ── Courses ──
  getMyCourses: () => client.get('/lms/courses/my-courses'),
  getCourse: (id) => client.get(`/lms/sections/${id}`),
  getMyStudents: () => client.get('/sis/faculty/me/students'),

  // ── Assignments ──
  getMyAssignments: () => client.get('/lms/assignments/faculty/v2'),
  getAssignmentsForSection: (sectionId) => client.get(`/lms/assignments/section/${sectionId}`),
  createAssignment: (data) => client.post('/lms/assignments', data),
  updateAssignment: (id, data) => client.put(`/lms/assignments/${id}`, data),
  deleteAssignment: (id) => client.delete(`/lms/assignments/${id}`),
  getAssignmentSubmissions: (assignmentId) => client.get(`/lms/submissions/assignment/${assignmentId}`),
  gradeSubmission: (subId, data) => client.put(`/lms/submissions/${subId}/grade`, data),
  getRecentSubmissions: () => client.get('/lms/submissions/faculty/recent'),

  // ── Quizzes ──
  getMyQuizzes: () => client.get('/lms/quizzes/faculty/v2'),
  getQuizzesForSection: (sectionId) => client.get(`/lms/quizzes/section/${sectionId}`),
  createQuiz: (data) => client.post('/lms/quizzes', data),
  updateQuiz: (id, data) => client.put(`/lms/quizzes/${id}`, data),
  deleteQuiz: (id) => client.delete(`/lms/quizzes/${id}`),

  // ── Attendance ──
  getAttendanceForCourse: (courseId, date) => client.get(`/attendance/course/${courseId}`, { params: { date } }),
  markAttendance: (courseId, date, records) => client.post('/attendance/mark', { courseId, date, records }),

  // ── Course Materials ──
  getCourseMaterials: (courseId) => client.get(`/lms/materials/course/${courseId}`),
  uploadMaterial: (courseId, formData) => client.post(`/lms/materials/course/${courseId}`, formData),

  // ── Announcements ──
  getCourseAnnouncements: (courseId) => client.get(`/lms/announcements/course/${courseId}`),
  createAnnouncement: (courseId, data) => client.post(`/lms/announcements/course/${courseId}`, data),
  deleteAnnouncement: (announcementId) => client.delete(`/lms/announcements/${announcementId}`),

  // ── Feedback ──
  getCourseFeedback: (courseId) => client.get(`/lms/feedback/course/${courseId}`),
  getFeedbackSummary: () => client.get(`/lms/feedback/faculty/me/summary`),
};

export default teacherAPI;
