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

import React, { useState } from 'react';
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

const TeacherDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const stats = [
    {
      title: 'My Courses',
      value: '5',
      subtitle: '+1 new',
      icon: School,
      color: 'primary',
      tooltip: 'Total courses you are teaching this semester. Manage course content, assignments, and student performance',
    },
    {
      title: 'Total Students',
      value: '312',
      subtitle: '+18 this sem',
      icon: People,
      color: 'success',
      tooltip: 'Total students enrolled across all your courses. View individual student profiles and track their progress',
    },
    {
      title: 'Pending Assignments',
      value: '23',
      subtitle: '5 overdue',
      icon: Assignment,
      color: 'warning',
      tooltip: 'Assignments awaiting grading. 5 submissions are past the grading deadline and need immediate attention',
    },
    {
      title: 'Attendance Rate',
      value: '87%',
      subtitle: '+2.3%',
      icon: CheckCircle,
      color: 'info',
      tooltip: 'Average attendance rate across all your courses. Improved by 2.3% compared to last month',
    },
  ];

  const myCourses = [
    {
      id: 1,
      code: 'CS-301',
      name: 'Data Structures & Algorithms',
      students: 85,
      schedule: 'Mon, Wed 9:00 AM',
      nextClass: 'Today, 9:00 AM',
      pendingAssignments: 12,
      avgGrade: 'B+',
      attendance: 88,
    },
    {
      id: 2,
      code: 'CS-201',
      name: 'Object Oriented Programming',
      students: 92,
      schedule: 'Tue, Thu 11:00 AM',
      nextClass: 'Tomorrow, 11:00 AM',
      pendingAssignments: 8,
      avgGrade: 'A-',
      attendance: 92,
    },
    {
      id: 3,
      code: 'CS-101',
      name: 'Introduction to Computing',
      students: 135,
      schedule: 'Mon, Wed, Fri 2:00 PM',
      nextClass: 'Today, 2:00 PM',
      pendingAssignments: 3,
      avgGrade: 'B',
      attendance: 85,
    },
  ];

  const upcomingClasses = [
    { course: 'CS-301', topic: 'Binary Search Trees', time: 'Today, 9:00 AM', room: 'Lab 3' },
    { course: 'CS-101', topic: 'Functions & Recursion', time: 'Today, 2:00 PM', room: 'Room 201' },
    { course: 'CS-201', topic: 'Inheritance & Polymorphism', time: 'Tomorrow, 11:00 AM', room: 'Lab 2' },
  ];

  const recentSubmissions = [
    {
      student: 'Muhammad Asad',
      avatar: 'https://i.pravatar.cc/150?img=12',
      assignment: 'Data Structures Assignment 3',
      course: 'CS-301',
      submittedAt: '2 hours ago',
      status: 'pending',
    },
    {
      student: 'Ayesha Khan',
      avatar: 'https://i.pravatar.cc/150?img=5',
      assignment: 'OOP Lab Task 5',
      course: 'CS-201',
      submittedAt: '5 hours ago',
      status: 'pending',
    },
    {
      student: 'Ali Ahmed',
      avatar: 'https://i.pravatar.cc/150?img=8',
      assignment: 'Computing Basics Quiz',
      course: 'CS-101',
      submittedAt: '1 day ago',
      status: 'graded',
    },
  ];

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
