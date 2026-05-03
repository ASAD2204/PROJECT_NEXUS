// Idempotent development seed data for MongoDB

// ---------------------------------------------------------------------------
// nexus_chat
// ---------------------------------------------------------------------------
db = db.getSiblingDB("nexus_chat");

db.chat_sessions.updateOne(
  { _id: "dev-session-1" },
  {
    $setOnInsert: {
      participants: ["student-user-dev", "faculty-user-dev"],
      is_group: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  { upsert: true }
);

db.chat_messages.updateOne(
  { _id: "dev-chat-msg-1" },
  {
    $setOnInsert: {
      conversation_id: "dev-session-1",
      sender_id: "faculty-user-dev",
      content: "Welcome to Project Nexus demo chat.",
      timestamp: new Date().toISOString()
    }
  },
  { upsert: true }
);

db.ai_chat_sessions.updateOne(
  { session_id: "dev-ai-session-1" },
  {
    $setOnInsert: {
      user_id: "student-user-dev",
      session_id: "dev-ai-session-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  { upsert: true }
);

db.ai_chat_messages.updateOne(
  { _id: "dev-ai-msg-1" },
  {
    $setOnInsert: {
      user_id: "student-user-dev",
      session_id: "dev-ai-session-1",
      role: "assistant",
      content: "Hello! I am Nexus AI.",
      timestamp: new Date().toISOString()
    }
  },
  { upsert: true }
);

print("Seeded nexus_chat");

// ---------------------------------------------------------------------------
// nexus_ops
// ---------------------------------------------------------------------------
db = db.getSiblingDB("nexus_ops");

db.content_announcements.updateOne(
  { _id: "dev-ann-1" },
  {
    $setOnInsert: {
      title: "Welcome Notice",
      content: "System seeded for demo use.",
      author_id: "admin-user-dev",
      target_audience: ["all"],
      priority: "normal",
      published_at: new Date().toISOString(),
      is_pinned: true,
      view_count: 0
    }
  },
  { upsert: true }
);

db.notifications.updateOne(
  { _id: "dev-op-notif-1" },
  {
    $setOnInsert: {
      user_id: "student-user-dev",
      title: "Ops Notification",
      message: "This is a seeded ops notification.",
      is_read: false,
      created_at: new Date().toISOString()
    }
  },
  { upsert: true }
);

print("Seeded nexus_ops");

// ---------------------------------------------------------------------------
// nexus_notify
// ---------------------------------------------------------------------------
db = db.getSiblingDB("nexus_notify");

db.notifications.updateOne(
  { _id: "dev-notify-1" },
  {
    $setOnInsert: {
      user_id: "student-user-dev",
      title: "Welcome",
      message: "Notification service seed record.",
      type: "system",
      priority: "normal",
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString()
    }
  },
  { upsert: true }
);

db.content_announcements.updateOne(
  { _id: "dev-notify-ann-1" },
  {
    $setOnInsert: {
      title: "Global Announcement",
      content: "This is a seeded global announcement.",
      author_id: "admin-user-dev",
      target_audience: ["all"],
      priority: "high",
      published_at: new Date().toISOString()
    }
  },
  { upsert: true }
);

print("Seeded nexus_notify");

// ---------------------------------------------------------------------------
// nexus_analytics
// ---------------------------------------------------------------------------
db = db.getSiblingDB("nexus_analytics");

db.analytics_events.updateOne(
  { _id: "dev-analytics-1" },
  {
    $setOnInsert: {
      event_type: "page_view",
      user_id: "student-user-dev",
      page_url: "/dashboard",
      timestamp: new Date().toISOString(),
      properties: { source: "seed" }
    }
  },
  { upsert: true }
);

print("Seeded nexus_analytics");

// ---------------------------------------------------------------------------
// nexus_lms
// ---------------------------------------------------------------------------
db = db.getSiblingDB("nexus_lms");

db.feedback_surveys.updateOne(
  { _id: "dev-survey-1" },
  {
    $setOnInsert: {
      survey_type: "course_feedback",
      course_id: 1,
      faculty_id: 1,
      student_id: 1,
      semester_id: 1,
      rating: 4,
      comments: "Seeded feedback entry.",
      submitted_at: new Date().toISOString()
    }
  },
  { upsert: true }
);

print("Seeded nexus_lms");
print("Mongo seed completed.");
