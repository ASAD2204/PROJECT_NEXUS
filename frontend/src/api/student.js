/**
 * Student API Service
 *
 * Student-facing normalization helpers for SIS, LMS, finance,
 * attendance, operations, and alumni data.
 */

import { authAPI } from './auth';
import { sisAPI } from './sis';
import { lmsAPI } from './lms';
import { financeAPI } from './finance';
import { attendanceAPI } from './attendance';
import { opsAPI } from './ops';
import { alumniAPI } from './alumni';

const toArray = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const compact = (payload) => Object.fromEntries(
  Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

const parseList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // Fall through to comma/newline separated parsing.
  }

  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatDate = (value, options = {}) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', options);
};

const formatRelativeTime = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const absMinutes = Math.floor(Math.abs(diffMs) / 60000);
  const suffix = diffMs >= 0 ? 'ago' : 'from now';

  if (absMinutes < 1) return 'Just now';
  if (absMinutes < 60) return `${absMinutes} minute${absMinutes === 1 ? '' : 's'} ${suffix}`;

  const absHours = Math.floor(absMinutes / 60);
  if (absHours < 24) return `${absHours} hour${absHours === 1 ? '' : 's'} ${suffix}`;

  const absDays = Math.floor(absHours / 24);
  if (absDays < 7) return `${absDays} day${absDays === 1 ? '' : 's'} ${suffix}`;

  return formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' }) || 'Recently';
};

const normalizeNotificationColor = (type, priority) => {
  const candidate = String(priority || type || 'info').toLowerCase();
  if (candidate.includes('error') || candidate.includes('critical')) return 'error';
  if (candidate.includes('warn') || candidate.includes('high')) return 'warning';
  if (candidate.includes('success') || candidate.includes('completed')) return 'success';
  if (candidate.includes('primary')) return 'primary';
  return 'info';
};

const normalizeTicketStatus = (status) => {
  const value = String(status || 'Submitted').trim().toLowerCase();
  if (value.includes('progress')) return 'In Progress';
  if (value.includes('resolve')) return 'Resolved';
  if (value.includes('reject')) return 'Rejected';
  if (value.includes('submit')) return 'Submitted';
  return value
    .split(/[_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const normalizeTranscriptRow = (row, index) => ({
  id: row.transcript_id ?? row.id ?? index + 1,
  transcriptId: row.transcript_id ?? row.id ?? index + 1,
  semesterId: row.semester_id ?? row.semesterId ?? index + 1,
  semester: row.semester_title || row.semesterTitle || `Semester ${row.semester_id ?? index + 1}`,
  semesterGPA: row.sgpa ?? row.semester_gpa ?? row.semesterGPA ?? 0,
  cumulativeGPA: row.cgpa ?? row.cumulative_gpa ?? row.cumulativeGPA ?? 0,
  generatedAt: row.generated_at || row.generatedAt || null,
});

const normalizeCourse = (enrollment, section) => {
  const sectionCourse = section?.course || {};
  const courseId = section?.course_id ?? section?.courseId ?? sectionCourse.course_id ?? sectionCourse.courseId ?? null;
  const sectionId = section?.section_id ?? section?.sectionId ?? enrollment?.section_id ?? enrollment?.sectionId ?? null;
  const courseCode = sectionCourse.code || section?.code || section?.course_code || `SEC-${sectionId}`;
  const courseTitle = sectionCourse.title || section?.title || section?.course_title || `Section ${sectionId}`;

  return {
    id: sectionId,
    section_id: sectionId,
    sectionId,
    course_id: courseId,
    courseId,
    code: courseCode,
    course_code: courseCode,
    courseCode,
    title: courseTitle,
    course_title: courseTitle,
    courseTitle,
    room: section?.room_no || section?.room || 'TBD',
    room_no: section?.room_no || section?.room || null,
    faculty: section?.faculty_id ? `Faculty #${section.faculty_id}` : 'TBD',
    faculty_id: section?.faculty_id ?? null,
    time: section?.time || section?.schedule || 'TBD',
    schedule: section?.schedule || section?.time || null,
    capacity: section?.capacity ?? null,
    status: enrollment?.status || 'Enrolled',
    enrollmentStatus: enrollment?.status || 'Enrolled',
    finalGradePoints: enrollment?.final_grade_points ?? enrollment?.finalGradePoints ?? null,
    final_grade_points: enrollment?.final_grade_points ?? enrollment?.finalGradePoints ?? null,
    creditHours: sectionCourse.credit_hours ?? sectionCourse.creditHours ?? 0,
    credit_hours: sectionCourse.credit_hours ?? sectionCourse.creditHours ?? 0,
    attendance_percentage: section?.attendance_percentage ?? section?.attendancePercentage ?? null,
    attendancePercentage: section?.attendance_percentage ?? section?.attendancePercentage ?? null,
  };
};

const normalizeAssignment = (assignment) => ({
  id: assignment.assignment_id ?? assignment.id,
  assignment_id: assignment.assignment_id ?? assignment.id,
  section_id: assignment.section_id ?? assignment.sectionId ?? null,
  sectionId: assignment.section_id ?? assignment.sectionId ?? null,
  title: assignment.title || 'Untitled Assignment',
  description: assignment.description || '',
  total_marks: assignment.total_marks ?? assignment.totalMarks ?? 0,
  totalMarks: assignment.total_marks ?? assignment.totalMarks ?? 0,
  due_date: assignment.due_date || assignment.dueDate || null,
  dueDate: assignment.due_date || assignment.dueDate || null,
  submitted_on: assignment.submitted_on || assignment.submittedOn || null,
  submittedOn: assignment.submitted_on || assignment.submittedOn || null,
  status: assignment.status || 'Pending',
  course: assignment.course || assignment.courseTitle || assignment.course_title || 'Course',
  course_title: assignment.course_title || assignment.courseTitle || assignment.course || 'Course',
  courseTitle: assignment.courseTitle || assignment.course_title || assignment.course || 'Course',
  course_code: assignment.course_code || assignment.courseCode || '',
  courseCode: assignment.courseCode || assignment.course_code || '',
  submitted_at: assignment.submitted_at || assignment.submittedAt || null,
  submittedAt: assignment.submitted_at || assignment.submittedAt || null,
  obtained_marks: assignment.obtained_marks ?? assignment.obtainedMarks ?? null,
  obtainedMarks: assignment.obtained_marks ?? assignment.obtainedMarks ?? null,
  attachment_ref_id: assignment.attachment_ref_id || assignment.attachmentRefId || null,
  attachmentRefId: assignment.attachment_ref_id || assignment.attachmentRefId || null,
  updated_at: assignment.updated_at || assignment.submitted_at || assignment.due_date || null,
  created_at: assignment.created_at || assignment.submitted_at || assignment.due_date || null,
});

const normalizeInvoice = (invoice) => ({
  id: invoice.invoice_id ?? invoice.id,
  invoice_id: invoice.invoice_id ?? invoice.id,
  student_id: invoice.student_id ?? invoice.studentId ?? null,
  total_amount: Number(invoice.total_amount ?? invoice.totalAmount ?? 0),
  totalAmount: Number(invoice.total_amount ?? invoice.totalAmount ?? 0),
  amount: Number(invoice.total_amount ?? invoice.totalAmount ?? 0),
  due_date: invoice.due_date || invoice.dueDate || null,
  dueDate: invoice.due_date || invoice.dueDate || null,
  status: invoice.status || 'Unpaid',
  items: toArray(invoice.items, ['items']).map((item) => ({
    id: item.item_id ?? item.id,
    item_id: item.item_id ?? item.id,
    head_id: item.head_id ?? item.headId ?? null,
    amount: Number(item.amount ?? 0),
    title: item.title || 'Fee Item',
  })),
});

const normalizeAnnouncement = (announcement) => ({
  id: announcement.id,
  title: announcement.title,
  content: announcement.content,
  author: announcement.author_name || 'System',
  authorAvatar: announcement.author_avatar,
  priority: announcement.priority || 'medium',
  isPinned: Boolean(announcement.is_pinned ?? announcement.isPinned),
  is_pinned: Boolean(announcement.is_pinned ?? announcement.isPinned),
  targetAudience: announcement.target_audience || announcement.targetAudience || [],
  target_audience: announcement.target_audience || announcement.targetAudience || [],
  createdAt: announcement.published_at || announcement.created_at || announcement.createdAt || null,
  created_at: announcement.published_at || announcement.created_at || announcement.createdAt || null,
  time: formatRelativeTime(announcement.published_at || announcement.created_at || announcement.createdAt),
});

const normalizeNotification = (notification) => {
  const createdAt = notification.created_at || notification.createdAt || null;
  const type = notification.type || 'info';
  const priority = notification.priority || 'medium';

  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    subtitle: notification.message,
    type,
    priority,
    category: type,
    read: Boolean(notification.is_read ?? notification.isRead),
    is_read: Boolean(notification.is_read ?? notification.isRead),
    readAt: notification.read_at || notification.readAt || null,
    createdAt,
    created_at: createdAt,
    time: formatRelativeTime(createdAt),
    expiresAt: notification.expires_at || notification.expiresAt || null,
    actionUrl: notification.action_url || notification.actionUrl || null,
    metadata: notification.metadata ?? null,
    color: normalizeNotificationColor(type, priority),
    iconKey: type,
  };
};

const normalizeGrievance = (grievance, comments = [], currentUserId = null) => ({
  id: grievance.ticket_id ?? grievance.id,
  ticket_id: grievance.ticket_id ?? grievance.id,
  category: grievance.category || 'General',
  subject: grievance.subject || grievance.category || 'Support Ticket',
  description: grievance.description || '',
  status: normalizeTicketStatus(grievance.status),
  date: formatDate(grievance.created_at || grievance.createdAt, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) || 'Recently',
  created_at: grievance.created_at || grievance.createdAt || null,
  updated_at: grievance.updated_at || grievance.updatedAt || null,
  assigned_department: grievance.assigned_department || grievance.assignedDepartment || null,
  resolution: grievance.resolution || null,
  priority: grievance.priority || 'Normal',
  is_urgent: Boolean(grievance.is_urgent ?? grievance.isUrgent),
  conversation: comments.map((comment) => ({
    from: currentUserId && String(comment.user_id) === String(currentUserId) ? 'You' : (comment.author_name || 'Support'),
    author_name: comment.author_name,
    author_avatar: comment.author_avatar,
    message: comment.comment,
    timestamp: formatRelativeTime(comment.created_at || comment.createdAt),
  })),
});

const normalizeAlumni = (alumnus) => {
  const expertise = parseList(alumnus.expertise);
  const achievements = parseList(alumnus.achievements);
  const displayName = alumnus.student_id ? `Alumni ${alumnus.student_id}` : `Alumni ${alumnus.alumni_id}`;

  return {
    id: alumnus.alumni_id,
    alumni_id: alumnus.alumni_id,
    student_id: alumnus.student_id,
    name: displayName,
    displayName,
    graduationYear: alumnus.grad_year,
    gradYear: alumnus.grad_year,
    degree: alumnus.degree || 'Degree not specified',
    company: alumnus.current_employer || 'Not specified',
    currentRole: alumnus.current_position || 'Alumni',
    current_role: alumnus.current_position || 'Alumni',
    location: alumnus.location || 'Not specified',
    photo: alumnus.photo_url || null,
    photoUrl: alumnus.photo_url || null,
    linkedin: alumnus.linkedin_url || null,
    linkedinUrl: alumnus.linkedin_url || null,
    expertise,
    achievements,
    bio: [alumnus.current_position, alumnus.current_employer, alumnus.location].filter(Boolean).join(' • ') || 'Alumni profile',
    industry: alumnus.current_employer || alumnus.degree || 'Alumni Network',
    mentoring: Boolean(alumnus.linkedin_url),
    email: null,
    phone: null,
  };
};

export const studentAPI = {
  getProfile: async () => {
    const [authRes, profileRes, programsRes, transcriptRes] = await Promise.allSettled([
      authAPI.getMe(),
      sisAPI.getMyProfile(),
      sisAPI.getPrograms(),
      sisAPI.getMyTranscript(),
    ]);

    const auth = authRes.status === 'fulfilled' ? (authRes.value.data || {}) : {};
    const profile = profileRes.status === 'fulfilled' ? (profileRes.value.data || {}) : {};
    const programs = programsRes.status === 'fulfilled' ? toArray(programsRes.value.data, ['programs']) : [];
    const transcripts = transcriptRes.status === 'fulfilled' ? toArray(transcriptRes.value.data, ['transcripts', 'rows', 'semesters']) : [];
    const latestTranscript = transcripts.length > 0 ? transcripts[transcripts.length - 1] : {};
    const program = programs.find((item) => String(item.program_id) === String(profile.program_id));
    const name = [auth.first_name, auth.last_name].filter(Boolean).join(' ') || auth.email || 'Student';

    return {
      data: {
        id: auth.user_id,
        user_id: auth.user_id,
        name,
        fullName: name,
        firstName: auth.first_name || '',
        first_name: auth.first_name || '',
        lastName: auth.last_name || '',
        last_name: auth.last_name || '',
        email: auth.email || '',
        personalEmail: auth.email || '',
        phone: auth.phone || profile.phone || '',
        rollNo: profile.roll_no || '',
        roll_no: profile.roll_no || '',
        studentId: profile.student_id || null,
        student_id: profile.student_id || null,
        cnic: profile.cnic || '',
        dob: profile.dob || '',
        address: profile.address || '',
        bloodGroup: profile.blood_group || '',
        blood_group: profile.blood_group || '',
        guardianName: profile.guardian_name || '',
        guardian_name: profile.guardian_name || '',
        guardianPhone: profile.guardian_phone || '',
        guardian_phone: profile.guardian_phone || '',
        currentSemester: profile.current_semester ?? null,
        current_semester: profile.current_semester ?? null,
        semester: profile.current_semester ?? latestTranscript.semester_id ?? null,
        currentRiskStatus: profile.current_risk_status || '',
        current_risk_status: profile.current_risk_status || '',
        programId: profile.program_id ?? null,
        program_id: profile.program_id ?? null,
        program: program?.title || (profile.program_id ? `Program ${profile.program_id}` : ''),
        cgpa: latestTranscript.cgpa ?? profile.cgpa ?? null,
        profileImageId: profile.profile_image_id || null,
        profile_image_id: profile.profile_image_id || null,
      },
    };
  },

  updateProfile: async (data) => {
    const payload = compact({
      cnic: data.cnic,
      dob: data.dob,
      address: data.address,
      phone: data.phone,
      blood_group: data.bloodGroup ?? data.blood_group,
      guardian_name: data.guardianName ?? data.fatherName ?? data.guardian_name,
      guardian_phone: data.guardianPhone ?? data.fatherPhone ?? data.guardian_phone,
      current_semester: data.currentSemester ?? data.current_semester,
    });
    await sisAPI.updateMyProfile(payload);
    return studentAPI.getProfile();
  },

  getEnrolledCourses: async () => {
    const enrollmentsRes = await sisAPI.getMyEnrollments();
    const enrollments = toArray(enrollmentsRes.data, ['enrollments']);
    if (!enrollments.length) {
      return { data: { courses: [] } };
    }

    const sectionResponses = await Promise.all(
      enrollments.map((enrollment) => sisAPI.getCourse(enrollment.section_id).catch(() => ({ data: {} })))
    );

    const courses = enrollments.map((enrollment, index) => normalizeCourse(enrollment, sectionResponses[index]?.data || {}));
    return { data: { courses } };
  },

  getAssignments: async () => {
    const res = await lmsAPI.getMyAssignments();
    const assignments = toArray(res.data, ['assignments']).map(normalizeAssignment);
    return { data: { assignments } };
  },

  getTranscript: async () => {
    const res = await sisAPI.getMyTranscript();
    const rows = toArray(res.data, ['transcripts', 'rows', 'semesters']).map(normalizeTranscriptRow);
    return {
      data: {
        rows,
        semesters: rows,
        transcript: rows,
        latest: rows.length > 0 ? rows[rows.length - 1] : null,
        latestCgpa: rows.length > 0 ? rows[rows.length - 1].cumulativeGPA : 0,
      },
    };
  },

  getInvoices: async () => {
    const res = await financeAPI.getMyInvoices();
    const invoices = toArray(res.data, ['invoices']).map(normalizeInvoice);
    return { data: { invoices } };
  },

  getAttendanceStats: async () => {
    const res = await attendanceAPI.getMyStats();
    const data = res.data || {};
    return {
      data: {
        percentage: data.percentage ?? data.attendance_percentage ?? 0,
        attended: data.attended ?? data.present_count ?? 0,
        totalClasses: data.totalClasses ?? data.total_classes ?? 0,
      },
    };
  },

  getAnnouncements: async () => {
    const res = await opsAPI.getAnnouncements();
    const announcements = toArray(res.data, ['announcements']).map(normalizeAnnouncement);
    return { data: { announcements } };
  },

  getNotifications: async () => {
    const res = await opsAPI.getNotifications();
    const notifications = toArray(res.data, ['notifications']).map(normalizeNotification);
    return { data: { notifications } };
  },

  markNotificationRead: (id) => opsAPI.markNotificationRead(id),
  markAllNotificationsRead: () => opsAPI.markAllNotificationsRead(),

  getTickets: async () => {
    const [meRes, grievancesRes] = await Promise.all([
      authAPI.getMe().catch(() => ({ data: {} })),
      opsAPI.getMyGrievances(),
    ]);

    const currentUser = meRes.data || {};
    const grievances = toArray(grievancesRes.data, ['grievances']);
    if (!grievances.length) {
      return { data: { grievances: [] } };
    }

    const commentResponses = await Promise.all(
      grievances.map((grievance) => opsAPI.getGrievanceComments(grievance.ticket_id).catch(() => ({ data: [] })))
    );

    const tickets = grievances.map((grievance, index) =>
      normalizeGrievance(grievance, toArray(commentResponses[index].data, ['comments']), currentUser.user_id)
    );

    return { data: { grievances: tickets } };
  },

  addTicketReply: (ticketId, comment) => opsAPI.addGrievanceComment(ticketId, comment),

  getAlumniDirectory: async () => {
    const res = await alumniAPI.getDirectory();
    const alumni = toArray(res.data, ['alumni']).map(normalizeAlumni);
    return { data: { alumni } };
  },
};

export default studentAPI;