/**
 * Auth API Service
 * 
 * Calls: POST /auth/login, POST /auth/register, GET /auth/me,
 *        POST /auth/logout, POST /auth/forgot-password,
 *        POST /auth/verify-otp, POST /auth/reset-password,
 *        PUT /auth/profile
 */

import client from './client';

export const authAPI = {
  login: (email, password) =>
    client.post('/auth/login', { email, password }),

  register: (data) =>
    client.post('/auth/register', data),

  getMe: () =>
    client.get('/auth/me'),

  logout: () =>
    client.post('/auth/logout'),

  forgotPassword: (email) =>
    client.post('/auth/forgot-password', { email }),

  verifyOTP: (email, otp) =>
    client.post('/auth/verify-otp', { email, otp }),

  resetPassword: (reset_token, new_password) =>
    client.post('/auth/reset-password', { reset_token, new_password }),

  updateProfile: (data) =>
    client.put('/auth/profile', data),

  updateUser: (userId, data) =>
    client.put(`/auth/users/${userId}`, data),

  listUsers: (params) =>
    client.get('/auth/users', { params }),

  toggleUserActive: (userId) =>
    client.put(`/auth/users/${userId}/toggle-active`),

  deleteUser: (userId) =>
    client.delete(`/auth/users/${userId}`),
};

export default authAPI;
