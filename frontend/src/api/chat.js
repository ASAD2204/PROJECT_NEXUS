/**
 * Chat API Service
 * 
 * REST calls: /chat/* endpoints — conversations, sessions, messages
 * WebSocket: ws://host/api/v1/chat/ws/{sessionId}?token=JWT
 */

import client from './client';

export const chatAPI = {
  // ── REST endpoints ──
  getConversations: () => client.get('/chat/conversations'),
  getSessions: () => client.get('/chat/sessions'),
  getGroups: () => client.get('/chat/groups'),
  createSession: (data) => client.post('/chat/sessions', data),
  createSessionByEmail: (email) => client.post('/chat/sessions/by-email', { email }),
  createGroup: (data) => client.post('/chat/groups', data),
  sendMessage: (sessionId, data) => client.post(`/chat/messages/${sessionId}`, data),
  getMessages: (sessionId, params) =>
    client.get(`/chat/messages/${sessionId}`, { params }),
  getOnlineUsers: () => client.get('/chat/online'),
  syncContacts: () => client.post('/chat/sync'),
  uploadFile: (formData) => client.post('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // ── WebSocket helper ──
  createWebSocket: (sessionId) => {
    if (!sessionId) {
      throw new Error('sessionId is required to open a chat WebSocket connection');
    }
    const token = localStorage.getItem('nexus_token');
    
    // Determine WS Base
    let wsBase = import.meta.env.VITE_WS_URL;
    
    if (!wsBase) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      // If we are on port 3001 (frontend), the gateway is likely on port 80/443 (same host)
      const port = window.location.port === '3001' ? '' : (window.location.port ? `:${window.location.port}` : '');
      wsBase = `${protocol}//${host}${port}/api/v1`;
    }
    
    return new WebSocket(`${wsBase}/chat/ws/${sessionId}?token=${token}`);
  },
};

export default chatAPI;
