/**
 * Teacher Dashboard
 * 
 * Main dashboard for teachers showing course statistics, recent activities, and quick actions.
 * Provides an overview of all teaching responsibilities and student performance.
 * 
 * Features:
 * - Course statistics (active courses, total students, assignments, avg attendance)
 * - Recent assignment submissions requiring grading
 * - Upcoming classes schedule
 * - Student performance overview
 * - Quick action buttons for common tasks
 * - Interactive charts and progress indicators
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  Paper,
  Stack,
  LinearProgress,
  IconButton,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  School,
  People,
  Assignment,
  CheckCircle,
  Schedule,
  TrendingUp,
  ArrowForward,
  Notifications,
  MoreVert,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import StatCard from '../../components/Common/StatCard';
import PageHeader from '../../components/Common/PageHeader';
import { pageTransition } from '../../utils/animations';
import { analyticsAPI } from '../../api/analytics';
import { teacherAPI } from '../../api/teacher';
import { chatAPI } from '../../api/chat';

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const clampPercent = (value, fallback = 0) => {
  const numericValue = toFiniteNumber(value, fallback);
  return Math.min(100, Math.max(0, numericValue));
};

const formatPercent = (value) => `${clampPercent(value).toFixed(1)}%`;

const safeText = (value, fallback = '—') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === 'nan' || normalized.toLowerCase() === 'undefined') {
    return fallback;
  }

  return normalized;
};

const normalizeSectionSummary = (section = {}) => {
  const sectionId = section.section_id ?? section.id ?? null;

  return {
    sectionId,
    courseName: safeText(
      section.course_name ?? section.course?.title ?? section.title,
      sectionId !== null ? `Section ${sectionId}` : 'Section'
    ),
    enrolledStudents: toFiniteNumber(section.enrolled_students ?? section.students),
    avgAttendancePct: clampPercent(section.avg_attendance_pct),
    avgQuizScore: clampPercent(section.avg_quiz_score),
    avgAssignmentScore: clampPercent(section.avg_assignment_score),
    atRiskCount: toFiniteNumber(section.at_risk_count),
    pendingAssignments: toFiniteNumber(section.pending_assignments),
  };
};

const normalizeCourseCard = (course = {}, sectionSummary = {}) => {
  const sectionId = course.section_id ?? course.id ?? sectionSummary.sectionId ?? null;
  const courseInfo = course.course ?? {};

  return {
    id: sectionId ?? courseInfo.course_id ?? course.course_id ?? sectionSummary.courseName,
    name: safeText(
      courseInfo.title ?? course.name ?? course.title ?? sectionSummary.courseName,
      sectionId !== null ? `Section ${sectionId}` : 'Untitled Course'
    ),
    code: safeText(
      courseInfo.code ?? course.code ?? (courseInfo.course_id ? `COURSE-${courseInfo.course_id}` : null) ?? (course.course_id ? `COURSE-${course.course_id}` : null) ?? (sectionId !== null ? `SEC-${sectionId}` : null),
      'N/A'
    ),
    students: toFiniteNumber(course.enrolled_students ?? course.students ?? sectionSummary.enrolledStudents),
    nextClass: safeText(course.nextClass ?? course.schedule ?? (course.semester_id ? `Semester ${course.semester_id}` : null), 'TBA'),
    room: safeText(course.room_no, 'TBA'),
    attendance: clampPercent(course.attendance_percentage ?? course.attendance ?? sectionSummary.avgAttendancePct),
    quizScore: clampPercent(sectionSummary.avgQuizScore),
    pendingAssignments: toFiniteNumber(course.pending_assignments ?? course.pendingAssignments ?? sectionSummary.pendingAssignments),
  };
};

const normalizeAssignmentCard = (assignment = {}) => ({
  id: assignment.id ?? assignment.assignment_id ?? null,
  title: safeText(assignment.title, 'Untitled Assignment'),
  courseName: safeText(assignment.courseName ?? assignment.course ?? assignment.course_title, 'Course'),
  pending: toFiniteNumber(assignment.pending),
  graded: toFiniteNumber(assignment.graded),
  submissions: toFiniteNumber(assignment.submissions),
  dueDate: safeText(assignment.dueDate ?? assignment.due_date, 'TBA'),
});

const TeacherDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [stats, setStats] = useState([
    { title: 'Total Students', value: '—', subtitle: '', icon: People, color: 'primary', tooltip: '' },
    { title: 'Avg Attendance', value: '—', subtitle: '', icon: CheckCircle, color: 'success', tooltip: '' },
    { title: 'Avg Course Score', value: '—', subtitle: '', icon: Assignment, color: 'warning', tooltip: '' },
    { title: 'Class Average', value: '—', subtitle: '', icon: School, color: 'info', tooltip: '' },
  ]);
  const [myCourses, setMyCourses] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, coursesRes, assignmentRes, recentSubRes] = await Promise.allSettled([
          analyticsAPI.getFacultyDashboard(),
          teacherAPI.getMyCourses(),
          teacherAPI.getMyAssignments(),
          teacherAPI.getRecentSubmissions(),
        ]);

        let sectionStats = [];
        let myCourseCards = [];
        let assignmentCards = [];

        if (dashRes.status === 'fulfilled') {
          const d = dashRes.value.data || {};
          sectionStats = Array.isArray(d?.sections) ? d.sections.map(normalizeSectionSummary) : [];
          const avgAttendance = sectionStats.length
            ? sectionStats.reduce((sum, section) => sum + section.avgAttendancePct, 0) / sectionStats.length
            : 0;

          setStats([
            { title: 'My Courses', value: String(toFiniteNumber(d?.total_sections)), subtitle: 'Assigned sections', icon: School, color: 'primary', tooltip: 'Sections assigned to you' },
            { title: 'Total Students', value: String(toFiniteNumber(d?.total_students)), subtitle: 'Across all sections', icon: People, color: 'success', tooltip: 'Total students enrolled' },
            { title: 'Avg Attendance', value: formatPercent(avgAttendance), subtitle: 'Across all sections', icon: CheckCircle, color: 'info', tooltip: 'Average attendance across your sections' },
            { title: 'Pending Assignments', value: String(toFiniteNumber(d?.total_pending_assignments)), subtitle: 'Needs review', icon: Assignment, color: 'warning', tooltip: 'Submissions awaiting your feedback' },
          ]);
        }

        if (coursesRes.status === 'fulfilled') {
          const rows = coursesRes.value.data?.courses || coursesRes.value.data || [];
          myCourseCards = (Array.isArray(rows) ? rows : []).map((course) => {
            const sectionId = course.section_id ?? course.id ?? null;
            const sectionSummary = sectionStats.find((section) => String(section.sectionId) === String(sectionId)) || {};
            return normalizeCourseCard(course, sectionSummary);
          });
        }

        if (!myCourseCards.length && sectionStats.length) {
          myCourseCards = sectionStats.map((section) => normalizeCourseCard({}, section));
        }

        setMyCourses(myCourseCards);

        setUpcomingClasses(
          myCourseCards.slice(0, 4).map((course) => ({
            course: course.name,
            topic: `Attendance ${formatPercent(course.attendance)} • ${course.students} students`,
            time: course.nextClass,
            room: course.room,
          }))
        );

        if (recentSubRes.status === 'fulfilled' && Array.isArray(recentSubRes.value.data) && recentSubRes.value.data.length > 0) {
          setRecentSubmissions(
            recentSubRes.value.data.slice(0, 6).map((sub) => ({
              id: sub.sub_id,
              assignmentId: sub.assignment_id,
              student: sub.student_name,
              assignment: sub.assignment_title,
              course: sub.course_name,
              submittedAt: sub.submitted_at,
              status: sub.marks_obtained !== null ? 'reviewed' : 'pending',
            }))
          );
        } else if (assignmentRes?.status === 'fulfilled') {
          const rows = assignmentRes.value.data?.assignments || assignmentRes.value.data || [];
          assignmentCards = (Array.isArray(rows) ? rows : []).map(normalizeAssignmentCard);
          const pendingQueue = assignmentCards.filter((assignment) => assignment.pending > 0);
          const sourceRows = pendingQueue.length > 0 ? pendingQueue : assignmentCards;

          if (sourceRows.length > 0) {
            setRecentSubmissions(
              sourceRows.slice(0, 6).map((assignment) => ({
                student: assignment.title,
                assignment: assignment.pending > 0
                  ? `${assignment.pending} pending submission${assignment.pending === 1 ? '' : 's'}`
                  : 'All submissions reviewed',
                course: assignment.courseName,
                submittedAt: assignment.dueDate,
                status: assignment.pending > 0 ? 'pending' : 'reviewed',
              }))
            );
          } else if (sectionStats.length > 0) {
            setRecentSubmissions(
              sectionStats.slice(0, 6).map((section) => ({
                student: section.courseName,
                assignment: section.pendingAssignments > 0
                  ? `${section.pendingAssignments} pending submission${section.pendingAssignments === 1 ? '' : 's'}`
                  : 'All submissions reviewed',
                course: `${section.enrolledStudents} students`,
                submittedAt: `Attendance ${formatPercent(section.avgAttendancePct)}`,
                status: section.pendingAssignments > 0 ? 'pending' : 'reviewed',
              }))
            );
          }
        } else if (sectionStats.length > 0) {
          setRecentSubmissions(
            sectionStats.slice(0, 6).map((section) => ({
              student: section.courseName,
              assignment: section.pendingAssignments > 0
                ? `${section.pendingAssignments} pending submission${section.pendingAssignments === 1 ? '' : 's'}`
                : 'All submissions reviewed',
              course: `${section.enrolledStudents} students`,
              submittedAt: `Attendance ${formatPercent(section.avgAttendancePct)}`,
              status: section.pendingAssignments > 0 ? 'pending' : 'reviewed',
            }))
          );
        }

        // Sync academic chat contacts
        chatAPI.syncContacts().catch(() => {});
      } catch (e) {
        console.error(e);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Teacher Dashboard"
          subtitle="Welcome back! Manage your courses, students, and assignments."
        />

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {stats.map((stat, index) => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
              <StatCard
                title={stat.title}
                value={stat.value}
                subtitle={stat.subtitle}
                icon={stat.icon}
                color={stat.color}
                tooltip={stat.tooltip}
              />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* My Courses */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    My Courses
                  </Typography>
                  <Button 
                    size="small" 
                    endIcon={<ArrowForward />} 
                    onClick={() => navigate('/teacher/courses')}
                    sx={{ minWidth: { xs: 75, sm: 'auto' } }}
                  >
                    View All
                  </Button>
                </Box>
                <Stack spacing={2}>
                  {myCourses.map((course) => (
                    <Paper
                      key={course.id}
                      elevation={0}
                      sx={{
                        p: 2.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          backgroundColor: alpha(theme.palette.primary.main, 0.02),
                        },
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                              sx={{
                                bgcolor: theme.palette.primary.main,
                                width: 48,
                                height: 48,
                              }}
                            >
                              <School />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {course.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {course.code} • {course.students} Students
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">
                            Next Class
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {course.nextClass}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Attendance
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="600">
                              {course.attendance}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={course.attendance}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                          <Chip
                            label={`${course.pendingAssignments} Pending`}
                            size="small"
                            color={course.pendingAssignments > 10 ? 'warning' : 'default'}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Recent Submissions */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Recent Submissions
                  </Typography>
                  <Button 
                    size="small" 
                    endIcon={<ArrowForward />}
                    sx={{ minWidth: { xs: 75, sm: 'auto' } }}
                  >
                    View All
                  </Button>
                </Box>
                <Stack spacing={2}>
                  {recentSubmissions.map((submission, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Avatar src={submission.avatar} alt={submission.student} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight="600">
                            {submission.student}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {submission.assignment}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {submission.course} • {submission.submittedAt}
                          </Typography>
                        </Box>
                        <Chip
                          label={submission.status}
                          size="small"
                          color={submission.status === 'pending' ? 'warning' : 'success'}
                        />
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, lg: 4 }}>
            {/* Upcoming Classes */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Schedule color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Upcoming Classes
                  </Typography>
                </Box>
                <Stack spacing={2}>
                  {upcomingClasses.map((cls, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: 2,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        borderLeft: 4,
                        borderColor: theme.palette.primary.main,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        {cls.course}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {cls.topic}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="primary">
                          {cls.time}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cls.room}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Quick Actions
                </Typography>
                <Stack spacing={1.5}>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    startIcon={<Assignment />}
                    onClick={() => navigate('/teacher/create-assignment')}
                    sx={{ justifyContent: 'flex-start', py: { xs: 1, sm: 1.5 } }}
                  >
                    Create Assignment
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    startIcon={<CheckCircle />}
                    onClick={() => navigate('/teacher/attendance')}
                    sx={{ justifyContent: 'flex-start', py: { xs: 1, sm: 1.5 } }}
                  >
                    Mark Attendance
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    startIcon={<People />}
                    onClick={() => navigate('/teacher/students')}
                    sx={{ justifyContent: 'flex-start', py: { xs: 1, sm: 1.5 } }}
                  >
                    View Students
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    startIcon={<Notifications />}
                    onClick={() => navigate('/teacher/courses')}
                    sx={{ justifyContent: 'flex-start', py: { xs: 1, sm: 1.5 } }}
                  >
                    Manage Courses
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default TeacherDashboard;
