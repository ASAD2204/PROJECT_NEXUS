/**
 * Alumni API Service
 * 
 * Calls: /alumni/* endpoints — register, directory, jobs, events,
 *        mentorship, stories, profile
 */

import client from './client';

export const alumniAPI = {
  // ── Registration & Directory ──
  register: (data) => client.post('/alumni/register', data),
  getDirectory: (params) => client.get('/alumni/directory', { params }),
  getAlumni: (id) => client.get(`/alumni/${id}`),
  getProfile: () => client.get('/alumni/profile'),
  deleteAlumni: (id) => client.delete(`/alumni/${id}`),
  exportAlumni: () => client.get('/alumni/export', { responseType: 'blob' }),
  importAlumni: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/alumni/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Profile ──
  updateProfile: (data) => client.put('/alumni/profile', data),
  updateAlumni: (id, data) => client.put(`/alumni/${id}`, data),

  // ── Jobs ──
  getJobs: () => client.get('/alumni/jobs'),
  createJob: (data) => client.post('/alumni/jobs', data),
  approveJob: (id) => client.put(`/alumni/jobs/${id}/approve`),
  deleteJob: (id) => client.delete(`/alumni/jobs/${id}`),

  // ── Events ──
  getEvents: () => client.get('/alumni/events'),
  createEvent: (data) => client.post('/alumni/events', data),
  registerForEvent: (eventId) => client.post(`/alumni/events/${eventId}/register`),
  deleteEvent: (id) => client.delete(`/alumni/events/${id}`),

  // ── Mentorship ──
  getMentors: () => client.get('/alumni/mentorship'),
  createMentorship: (data) => client.post('/alumni/mentorship', data),
  deleteMentorship: (id) => client.delete(`/alumni/mentorship/${id}`),

  // ── Success Stories ──
  getStories: () => client.get('/alumni/stories'),
  createStory: (data) => client.post('/alumni/stories', data),
  approveStory: (id) => client.put(`/alumni/stories/${id}/approve`),
  downloadReport: () => client.get('/alumni/reports/pdf', { responseType: 'blob' }),
};

export default alumniAPI;
