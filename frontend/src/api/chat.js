/**
 * Chat API Service
 * 
 * REST calls: /chat/* endpoints — sessions, messages
 * WebSocket: ws://host/api/v1/chat/ws?token=JWT
 */

import client from './client';

export const chatAPI = {
  // ── REST endpoints ──
  getSessions: () => client.get('/chat/sessions'),
  getGroups: () => client.get('/chat/groups'),
  createSession: (data) => client.post('/chat/sessions', data),
  sendMessage: (sessionId, data) => client.post(`/chat/messages/${sessionId}`, data),
  getMessages: (sessionId, params) =>
    client.get(`/chat/messages/${sessionId}`, { params }),
  getOnlineUsers: () => client.get('/chat/online'),

  // ── WebSocket helper ──
  createWebSocket: () => {
    const token = localStorage.getItem('nexus_token');
    const wsBase = import.meta.env.VITE_WS_URL ||
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1`;
    return new WebSocket(`${wsBase}/chat/ws?token=${token}`);
  },
};

export default chatAPI;
