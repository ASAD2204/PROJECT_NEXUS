/**
 * Operations API Service
 * 
 * Calls: /ops/* endpoints — grievances, announcements, audit trails,
 *        notifications, media assets, system logs, feature flags
 */

import client from './client';

export const opsAPI = {
  // ── Grievances ──
  createGrievance: (data) => client.post('/ops/grievances', data),
  getMyGrievances: () => client.get('/ops/grievances/me'),
  getGrievances: (params) => client.get('/ops/grievances', { params }),
  updateGrievanceStatus: (ticketId, data) =>
    client.put(`/ops/grievances/${ticketId}/status`, data),
  getGrievanceComments: (ticketId) =>
    client.get(`/ops/grievances/${ticketId}/comments`),
  addGrievanceComment: (ticketId, comment) =>
    client.post(`/ops/grievances/${ticketId}/comments`, { comment }),

  // ── Announcements ──
  createAnnouncement: (data) => client.post('/ops/announcements', data),
  getAnnouncements: (params) => client.get('/ops/announcements', { params }),
  getAnnouncement: (id) => client.get(`/ops/announcements/${id}`),
  updateAnnouncement: (id, data) => client.put(`/ops/announcements/${id}`, data),
  deleteAnnouncement: (id) => client.delete(`/ops/announcements/${id}`),
  likeAnnouncement: (id) => client.post(`/ops/announcements/${id}/like`),
  getAnnouncementComments: (id) => client.get(`/ops/announcements/${id}/comments`),
  createAnnouncementComment: (id, data) => client.post(`/ops/announcements/${id}/comments`, data),

  // ── Notifications ──
  getNotifications: (params) => client.get('/ops/notifications/me', { params }),
  createNotification: (data) => client.post('/ops/notifications', data),
  getMyNotifications: (params) => client.get('/ops/notifications/me', { params }),
  markNotificationRead: (id) => client.put(`/ops/notifications/${id}/read`),
  markAllNotificationsRead: () => client.put('/ops/notifications/read-all'),

  // ── Audit Trails ──
  createAuditTrail: (data) => client.post('/ops/audit-trails', data),
  getAuditTrails: (params) => client.get('/ops/audit-trails', { params }),

  // ── Media Assets ──
  createMediaAsset: (data) => client.post('/ops/media-assets', data),
  getMediaAssets: (params) => client.get('/ops/media-assets', { params }),
  deleteMediaAsset: (id) => client.delete(`/ops/media-assets/${id}`),

  // ── System Logs ──
  createSystemLog: (data) => client.post('/ops/system-logs', data),
  getSystemLogs: (params) => client.get('/ops/system-logs', { params }),

  // ── Feature Flags ──
  setFeatureFlag: (name, data = {}) =>
    client.put(`/ops/feature-flags/${name}`, null, {
      params: {
        enabled: data.enabled ?? true,
        rollout_percentage: data.rollout_percentage ?? 100,
      },
    }),
  getFeatureFlag: (name) => client.get(`/ops/feature-flags/${name}`),
  listFeatureFlags: () => client.get('/ops/feature-flags'),
  getFeatureFlags: async () => {
    const res = await client.get('/ops/feature-flags');
    const flags = Array.isArray(res.data) ? res.data : [];
    const mapped = {};
    flags.forEach((flag) => {
      if (flag?.feature) {
        mapped[flag.feature] = Boolean(flag.enabled);
      }
    });
    return { data: mapped };
  },
  updateFeatureFlags: async (flags) => {
    const entries = Object.entries(flags || {}).filter(([, value]) => typeof value === 'boolean');
    await Promise.all(entries.map(([name, enabled]) => opsAPI.setFeatureFlag(name, { enabled })));
    return { data: { updated: entries.length } };
  },
  deleteFeatureFlag: (name) => client.delete(`/ops/feature-flags/${name}`),
};

export default opsAPI;
