/**
 * Attendance API Service
 * 
 * Calls: /attendance/* endpoints — GPS check, liveness, face verify,
 *        mark attendance, history, stats
 */

import client from './client';

export const attendanceAPI = {
  // ── 3-step biometric flow ──
  checkGPS: (data) => client.post('/attendance/gps-check', data),
  verifyLiveness: (data) => client.post('/attendance/verify-liveness', data),
  checkLiveness: (formData) =>
    client.post('/attendance/liveness-check', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  verifyFace: (data) => client.post('/attendance/verify-face', data),
  markAttendance: (data) => client.post('/attendance/mark', data),

  // ── History & Stats ──
  getMyHistory: (params) => client.get('/attendance/history/me', { params }),
  getHistory: (params) => client.get('/attendance/history', { params }),
  getStats: (params) => client.get('/attendance/stats', { params }),
  getMyStats: () => client.get('/attendance/stats/me'),

  // ── Geofence settings ──
  getGeofenceConfig: () => client.get('/attendance/geofence'),
  updateGeofenceConfig: (data) => client.put('/attendance/geofence', data),
  resetGeofenceConfig: () => client.delete('/attendance/geofence'),

  // ── Enrollment (face registration) ──
  enrollFace: (formData) =>
    client.post('/attendance/enroll', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  enrollFaceForStudent: (studentId, data) => client.post(`/attendance/enroll-face/${studentId}`, data),
  enrollFaceMulti: (studentId, data) => client.post(`/attendance/enroll-face-multi/${studentId}`, data),

  // ── Active Sessions (for teacher) ──
  getActiveSessions: () => client.get('/attendance/sessions/active'),
  createSession: (data) => client.post('/attendance/sessions', data),
  getAll: (params) => client.get('/attendance/records', { params }),
};

export default attendanceAPI;
