// ==========================================================================
// Project Nexus — MongoDB Initialization Script
// Databases: nexus_chat, nexus_ops, nexus_analytics, nexus_lms
// Run via: docker exec nexus-mongo mongosh < init-mongo.js
// Or mount as /docker-entrypoint-initdb.d/init-mongo.js
// ==========================================================================

// =========================================================================
// DATABASE: nexus_chat  (chat-service, ai-service)
// =========================================================================
db = db.getSiblingDB("nexus_chat");

// --- Collection 1: chat_messages (FYP Table 135) ---
db.createCollection("chat_messages");
db.chat_messages.createIndex({ conversation_id: 1 });
db.chat_messages.createIndex({ sender_id: 1 });
db.chat_messages.createIndex({ timestamp: 1 });
db.chat_messages.createIndex(
  { conversation_id: 1, timestamp: 1 },
  { name: "conversation_timestamp_compound" }
);

// --- chat_sessions (P2P sessions) ---
db.createCollection("chat_sessions");
db.chat_sessions.createIndex({ participants: 1 });

// --- ai_chat_messages (AI assistant messages) ---
db.createCollection("ai_chat_messages");
db.ai_chat_messages.createIndex({ user_id: 1 });
db.ai_chat_messages.createIndex({ timestamp: 1 });
db.ai_chat_messages.createIndex(
  { user_id: 1, session_id: 1, timestamp: 1 },
  { name: "user_session_timestamp" }
);

// --- ai_chat_sessions (AI assistant sessions) ---
db.createCollection("ai_chat_sessions");
db.ai_chat_sessions.createIndex({ user_id: 1 });
db.ai_chat_sessions.createIndex({ session_id: 1 }, { unique: true });
db.ai_chat_sessions.createIndex({ updated_at: -1 });

print("✓ nexus_chat indexes created");

// =========================================================================
// DATABASE: nexus_ops  (operations-service)
// =========================================================================
db = db.getSiblingDB("nexus_ops");

// --- Collection 6: content_announcements (FYP Table 140) ---
db.createCollection("content_announcements");
db.content_announcements.createIndex({ author_id: 1 });
db.content_announcements.createIndex({ course_id: 1 });
db.content_announcements.createIndex({ published_at: 1 });
db.content_announcements.createIndex({ expires_at: 1 });
db.content_announcements.createIndex({ is_pinned: 1 });
db.content_announcements.createIndex({ target_audience: 1 });
db.content_announcements.createIndex({ likes_count: 1 });
db.content_announcements.createIndex({ comments_count: 1 });
db.content_announcements.createIndex(
  { target_audience: 1, is_pinned: -1, published_at: -1 },
  { name: "audience_pin_published" }
);

// --- Collection 2: audit_trails (FYP Table 136) ---
db.createCollection("audit_trails");
db.audit_trails.createIndex({ user_id: 1 });
db.audit_trails.createIndex({ action: 1 });
db.audit_trails.createIndex({ timestamp: 1 });
db.audit_trails.createIndex(
  { user_id: 1, timestamp: 1 },
  { name: "user_timestamp" }
);
db.audit_trails.createIndex(
  { target_entity: 1, entity_id: 1 },
  { name: "entity_compound" }
);

// --- Collection 3: media_assets (FYP Table 137) ---
db.createCollection("media_assets");
db.media_assets.createIndex({ uploader_id: 1 });
db.media_assets.createIndex({ s3_key: 1 }, { unique: true });
db.media_assets.createIndex(
  { entity_type: 1, entity_id: 1 },
  { name: "entity_type_id" }
);

// --- Collection 4: notifications (FYP Table 138) ---
db.createCollection("notifications");
db.notifications.createIndex({ user_id: 1 });
db.notifications.createIndex({ is_read: 1 });
db.notifications.createIndex({ created_at: 1 });
db.notifications.createIndex(
  { user_id: 1, is_read: 1, created_at: 1 },
  { name: "user_read_created" }
);
db.notifications.createIndex(
  { expires_at: 1 },
  { expireAfterSeconds: 0, name: "ttl_expires_at" }
);

// --- Collection 7: system_logs (FYP Table 141) ---
db.createCollection("system_logs");
db.system_logs.createIndex({ service_name: 1 });
db.system_logs.createIndex({ level: 1 });
db.system_logs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 2592000, name: "ttl_30d" }  // 30 days
);
db.system_logs.createIndex(
  { service_name: 1, level: 1, timestamp: 1 },
  { name: "service_level_ts" }
);

print("✓ nexus_ops indexes created");

// =========================================================================
// DATABASE: nexus_notify  (notification-service)
// =========================================================================
db = db.getSiblingDB("nexus_notify");

// --- notifications ---
db.createCollection("notifications");
db.notifications.createIndex({ user_id: 1 });
db.notifications.createIndex({ is_read: 1 });
db.notifications.createIndex({ created_at: -1 });
db.notifications.createIndex(
  { user_id: 1, is_read: 1, created_at: -1 },
  { name: "user_read_created_desc" }
);

// --- content_announcements ---
db.createCollection("content_announcements");
db.content_announcements.createIndex({ author_id: 1 });
db.content_announcements.createIndex({ published_at: -1 });
db.content_announcements.createIndex({ target_audience: 1 });
db.content_announcements.createIndex({ course_id: 1 });
db.content_announcements.createIndex({ likes_count: 1 });
db.content_announcements.createIndex({ comments_count: 1 });
db.content_announcements.createIndex(
  { target_audience: 1, is_pinned: -1, published_at: -1 },
  { name: "audience_pin_published" }
);

print("✓ nexus_notify indexes created");

// =========================================================================
// DATABASE: nexus_analytics  (analytics-service)
// =========================================================================
db = db.getSiblingDB("nexus_analytics");

// --- Collection 5: analytics_events (FYP Table 139) ---
db.createCollection("analytics_events");
db.analytics_events.createIndex({ event_type: 1 });
db.analytics_events.createIndex({ user_id: 1 });
db.analytics_events.createIndex({ timestamp: 1 });
db.analytics_events.createIndex(
  { event_type: 1, timestamp: 1 },
  { name: "event_type_timestamp" }
);

print("✓ nexus_analytics indexes created");

// =========================================================================
// DATABASE: nexus_lms  (lms-service)
// =========================================================================
db = db.getSiblingDB("nexus_lms");

// --- Collection 8: feedback_surveys (FYP Table 142) ---
db.createCollection("feedback_surveys");
db.feedback_surveys.createIndex({ survey_type: 1 });
db.feedback_surveys.createIndex({ course_id: 1 });
db.feedback_surveys.createIndex({ faculty_id: 1 });
db.feedback_surveys.createIndex({ student_id: 1 });
db.feedback_surveys.createIndex({ submitted_at: 1 });
db.feedback_surveys.createIndex(
  { faculty_id: 1, semester_id: 1 },
  { name: "faculty_semester" }
);

print("✓ nexus_lms indexes created");

print("=== MongoDB initialization complete ===");
