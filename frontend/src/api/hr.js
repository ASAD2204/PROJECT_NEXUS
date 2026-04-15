/**
 * HR API Service
 * 
 * Calls: /hr/* endpoints — leaves, employees
 */

import client from './client';

export const hrAPI = {
  // ── Leaves ──
  applyLeave: (data) => client.post('/hr/leaves/apply', data),
  getMyLeaves: () => client.get('/hr/leaves/me'),
  getPendingLeaves: () => client.get('/hr/leaves/pending'),
  approveLeave: (id) => client.put(`/hr/leaves/${id}/approve`),
  rejectLeave: (id, reason) => client.put(`/hr/leaves/${id}/reject`, { reason }),

  // ── Employees ──
  getEmployees: () => client.get('/hr/employees'),
  getEmployee: (id) => client.get(`/hr/employees/${id}`),
  updateEmployee: (id, data) => client.put(`/hr/employees/${id}`, data),
};

export default hrAPI;
