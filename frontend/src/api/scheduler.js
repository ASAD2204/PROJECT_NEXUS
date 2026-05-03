import client from './client';

export const schedulerAPI = {
  getConstraints: () => client.get('/scheduler/constraints'),
  createConstraint: (data) => client.post('/scheduler/constraints', data),
  deleteConstraint: (id) => client.delete(`/scheduler/constraints/${id}`),
  generateTimetable: (data) => client.post('/scheduler/generate', data),
  getTimetableSets: () => client.get('/scheduler/timetable-sets'),
  getTimetableSet: (id) => client.get(`/scheduler/timetable-sets/${id}`),
  publishTimetableSet: (id) => client.post(`/scheduler/timetable-sets/${id}/publish`),
  deleteTimetableSet: (id) => client.delete(`/scheduler/timetable-sets/${id}`),
  exportTimetableSet: (id) => client.get(`/scheduler/timetable-sets/${id}/export`, { responseType: 'blob' }),
};

export default schedulerAPI;
