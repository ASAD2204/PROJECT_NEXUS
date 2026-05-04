/**
 * Scheduler API Service
 * 
 * Calls: /scheduler/* endpoints — constraints, timetable generation, 
 *        draft management, publishing.
 */

import client from './client';

export const schedulerAPI = {
  // ── Constraints ──
  getConstraints: () => client.get('/scheduler/constraints'),
  createConstraint: (data) => client.post('/scheduler/constraints', data),
  deleteConstraint: (id) => client.delete(`/scheduler/constraints/${id}`),

  // ── Generation ──
  /**
   * Generates a timetable batch for a list of courses.
   * payload: { 
   *   course_ids: number[], 
   *   days_of_week: string[], 
   *   slot_minutes: number,
   *   start_hour: number,
   *   end_hour: number,
   *   ... 
   * }
   */
  generateTimetable: (payload) => client.post('/scheduler/generate', payload),

  // ── Timetable Sets (Drafts) ──
  getTimetableSets: () => client.get('/scheduler/sets'),
  getTimetableSet: (setId) => client.get(`/scheduler/sets/${setId}`),
  publishTimetableSet: (setId) => client.post(`/scheduler/sets/${setId}/publish`),
  deleteTimetableSet: (setId) => client.delete(`/scheduler/sets/${setId}`),
  exportTimetableSet: (setId) => client.get(`/scheduler/sets/${setId}/export`, { responseType: 'blob' }),

  // ── View Timetable ──
  getCourseTimetable: (courseId) => client.get(`/scheduler/timetable/course/${courseId}`),
  getStudentTimetable: () => client.get('/scheduler/timetable/student'),
  getFacultyTimetable: () => client.get('/scheduler/timetable/faculty'),
  getRoomTimetable: (roomNo) => client.get(`/scheduler/timetable/room/${roomNo}`),
};

export default schedulerAPI;
