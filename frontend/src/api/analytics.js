/**
 * Analytics API Service
 * 
 * Calls: /analytics/* endpoints — dashboards, risk prediction
 */

import client from './client';

export const analyticsAPI = {
  getStudentDashboard: () => client.get('/analytics/dashboard/student'),
  getFacultyDashboard: () => client.get('/analytics/dashboard/faculty'),
  getAdminDashboard: () => client.get('/analytics/dashboard/admin'),
  getRiskPrediction: (studentId) => client.get(`/analytics/student/${studentId}/risk`),
  getMyRisk: async () => {
    const res = await client.get('/analytics/dashboard/student');
    return {
      data: {
        risk_level: res.data?.risk_level,
        student_id: res.data?.student_id,
      },
    };
  },
  trackEvent: (data) => client.post('/analytics/events', data),
  getEvents: (params) => client.get('/analytics/events', { params }),
};

export default analyticsAPI;
