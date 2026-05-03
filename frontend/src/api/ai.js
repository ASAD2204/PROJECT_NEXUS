/**
 * AI Assistant API Service
 * 
 * Calls: /ai/* endpoints — chat, history, feedback
 */

import client from './client';

export const aiAPI = {
  chat: (message, sessionId, attachments = null) =>
    client.post('/ai/chat', { query: message, session_id: sessionId, attachments }),
  getHistory: (sessionId) =>
    client.get('/ai/chat/history', {
      params: sessionId ? { session_id: sessionId } : undefined,
    }),
  clearHistory: (sessionId) =>
    client.delete('/ai/chat/history', {
      params: sessionId ? { session_id: sessionId } : undefined,
    }),
  // No dedicated AI feedback endpoint exists yet.
  submitFeedback: (data) => client.post('/analytics/events', {
    event_type: 'ai_feedback',
    properties: data,
  }),
  getStats: () => client.get('/ai/status'),
};

export default aiAPI;
