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

const TeacherDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [stats, setStats] = useState([
    { title: 'My Courses', value: '—', subtitle: '', icon: School, color: 'primary', tooltip: '' },
    { title: 'Total Students', value: '—', subtitle: '', icon: People, color: 'success', tooltip: '' },
    { title: 'Pending Assignments', value: '—', subtitle: '', icon: Assignment, color: 'warning', tooltip: '' },
    { title: 'Attendance Rate', value: '—', subtitle: '', icon: CheckCircle, color: 'info', tooltip: '' },
  ]);
  const [myCourses, setMyCourses] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, coursesRes] = await Promise.allSettled([
          analyticsAPI.getFacultyDashboard(),
          teacherAPI.getMyCourses(),
        ]);
        let sectionStats = [];
        if (dashRes.status === 'fulfilled') {
          const d = dashRes.value.data;
          sectionStats = Array.isArray(d?.sections) ? d.sections : [];
          const avgAttendance = sectionStats.length
            ? sectionStats.reduce((sum, s) => sum + Number(s.avg_attendance_pct || 0), 0) / sectionStats.length
            : 0;
          const avgPending = sectionStats.length
            ? sectionStats.reduce((sum, s) => sum + Math.max(0, 100 - Number(s.avg_assignment_score || 0)), 0) / sectionStats.length
            : 0;

          setStats([
            { title: 'My Courses', value: String(d?.total_sections ?? 0), subtitle: 'Assigned sections', icon: School, color: 'primary', tooltip: '' },
            { title: 'Total Students', value: String(d?.total_students ?? 0), subtitle: 'Across all sections', icon: People, color: 'success', tooltip: '' },
            { title: 'Pending Assignments', value: String(Math.round(avgPending)), subtitle: 'Estimated by score gap', icon: Assignment, color: 'warning', tooltip: '' },
            { title: 'Attendance Rate', value: `${avgAttendance.toFixed(1)}%`, subtitle: 'Average section attendance', icon: CheckCircle, color: 'info', tooltip: '' },
          ]);

          setUpcomingClasses(
            sectionStats.slice(0, 4).map((s, idx) => ({
              course: s.course_name || `Section ${s.section_id}`,
              topic: 'Scheduled class',
              time: `Slot ${idx + 1}`,
              room: 'TBA',
            }))
          );

          setRecentSubmissions(
            sectionStats.slice(0, 6).map((s) => ({
              student: `${s.enrolled_students || 0} students`,
              assignment: `Avg assignment ${Number(s.avg_assignment_score || 0).toFixed(1)}%`,
              course: s.course_name || `Section ${s.section_id}`,
              submittedAt: 'Latest analytics snapshot',
              status: Number(s.avg_assignment_score || 0) >= 70 ? 'reviewed' : 'pending',
            }))
          );
        }
        if (coursesRes.status === 'fulfilled') {
          const rows = coursesRes.value.data?.courses || coursesRes.value.data || [];
          const normalized = (Array.isArray(rows) ? rows : []).map((c) => {
            const sid = c.section_id || c.id;
            const section = sectionStats.find((s) => String(s.section_id) === String(sid));
            return {
              id: sid,
              name: c.name || c.title || c.course_title || section?.course_name || `Section ${sid}`,
              code: c.code || c.course_code || (c.course_id ? `COURSE-${c.course_id}` : `SEC-${sid}`),
              students: c.students || c.enrolled_students || section?.enrolled_students || 0,
              nextClass: c.nextClass || c.time || c.schedule || 'TBA',
              attendance: Number(c.attendance || c.attendance_percentage || section?.avg_attendance_pct || 0),
              pendingAssignments: Math.max(0, Math.round(100 - Number(section?.avg_assignment_score || 0))),
            };
          });
          setMyCourses(normalized);
        }
      } catch (e) { console.error(e); }
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
                    onClick={() => navigate('/attendance/smart-attendance')}
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
