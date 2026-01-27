/**
 * Admin Dashboard
 * 
 * Comprehensive administrative dashboard providing system-wide overview and analytics.
 * Central command center for administrators to monitor and manage the entire platform.
 * 
 * Features:
 * - Key metrics cards (students, teachers, courses, revenue)
 * - Student enrollment trends chart
 * - Department-wise distribution
 * - Recent registrations list
 * - Course enrollment statistics
 * - Financial overview
 * - Quick action buttons
 * - System health indicators
 * - Interactive data visualizations
 * - Real-time updates
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
  IconButton,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Paper,
  Stack,
  Divider,
  Menu,
  MenuItem,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp,
  TrendingDown,
  People,
  School,
  Payment,
  EventAvailable,
  MoreVert,
  ArrowForward,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Group,
  PersonAdd,
  Assignment,
  AccountBalance,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import StatCard from '../../components/Common/StatCard';
import PageHeader from '../../components/Common/PageHeader';
import { pageTransition } from '../../utils/animations';

const AdminDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  // Mock data
  const stats = [
    {
      title: 'Total Students',
      value: '2,847',
      subtitle: '+12.5% from last month',
      icon: People,
      color: 'primary',
      tooltip: 'Total number of enrolled students across all programs and departments',
    },
    {
      title: 'Faculty Members',
      value: '186',
      subtitle: '+3.2% new hires',
      icon: School,
      color: 'success',
      tooltip: 'Total number of teaching and research faculty members',
    },
    {
      title: 'Active Courses',
      value: '342',
      subtitle: '+8.1% this semester',
      icon: Assignment,
      color: 'info',
      tooltip: 'Number of courses currently being offered this semester',
    },
    {
      title: 'Revenue (This Month)',
      value: '₨ 8.5M',
      subtitle: '+15.3% increase',
      icon: AccountBalance,
      color: 'warning',
      tooltip: 'Total revenue collected from fees and other sources this month',
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'student',
      title: 'New Student Enrollment',
      description: '5 new students enrolled in Computer Science',
      time: '10 minutes ago',
      status: 'success',
    },
    {
      id: 2,
      type: 'faculty',
      title: 'Faculty Leave Request',
      description: 'Dr. Ahmed requested leave for next week',
      time: '1 hour ago',
      status: 'warning',
    },
    {
      id: 3,
      type: 'payment',
      title: 'Fee Payment Overdue',
      description: '23 students have overdue payments',
      time: '2 hours ago',
      status: 'error',
    },
    {
      id: 4,
      type: 'course',
      title: 'Course Registration Opened',
      description: 'Spring 2026 course registration is now open',
      time: '3 hours ago',
      status: 'info',
    },
  ];

  const departments = [
    { name: 'Computer Science', students: 852, faculty: 45, courses: 98, growth: 12 },
    { name: 'Business Admin', students: 743, faculty: 38, courses: 87, growth: 8 },
    { name: 'Engineering', students: 621, faculty: 42, courses: 76, growth: 15 },
    { name: 'Medical Sciences', students: 431, faculty: 35, courses: 54, growth: 10 },
    { name: 'Arts & Design', students: 200, faculty: 26, courses: 27, growth: 5 },
  ];

  const pendingApprovals = [
    { type: 'Leave Requests', count: 12, icon: EventAvailable },
    { type: 'Course Proposals', count: 5, icon: Assignment },
    { type: 'Fee Waivers', count: 18, icon: Payment },
    { type: 'Student Registrations', count: 8, icon: PersonAdd },
  ];

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Admin Dashboard"
          subtitle="Welcome back! Here's what's happening with your institution today."
        />

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {stats.map((stat, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
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

        {/* Pending Approvals - Full Width */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Pending Approvals
                </Typography>
                <Grid container spacing={2}>
                  {pendingApprovals.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            backgroundColor: alpha(theme.palette.warning.main, 0.08),
                            borderRadius: 2,
                            borderLeft: 4,
                            borderColor: theme.palette.warning.main,
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.warning.main, 0.12),
                              transform: 'translateY(-4px)',
                              boxShadow: theme.shadows[4],
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: theme.palette.warning.main,
                                width: 48,
                                height: 48,
                              }}
                            >
                              <Icon />
                            </Avatar>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                              {item.count}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            {item.type}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Grid - Better Layout */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Departments Overview - Takes Priority */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Departments Overview
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Top performing departments
                    </Typography>
                  </Box>
                  <Button 
                    size="small"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate('/admin/departments')}
                    sx={{ minWidth: { xs: 80, sm: 'auto' } }}
                  >
                    View All
                  </Button>
                </Box>
                <Stack spacing={2}>
                  {departments.map((dept, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: 2.5,
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {dept.name}
                        </Typography>
                        <Chip
                          icon={<TrendingUp />}
                          label={`+${dept.growth}%`}
                          size="small"
                          color="success"
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>
                      <Grid container spacing={3}>
                        <Grid size={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" fontWeight="bold" color="primary.main">
                              {dept.students}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Students
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" fontWeight="bold" color="success.main">
                              {dept.faculty}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Faculty
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" fontWeight="bold" color="info.main">
                              {dept.courses}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Courses
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Today's Attendance - Sidebar */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ mb: 3, height: 'auto' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Today's Attendance
                </Typography>
                <Stack spacing={2}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                      border: '2px solid',
                      borderColor: alpha(theme.palette.success.main, 0.3),
                      borderRadius: 2,
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="h3" fontWeight="bold" color="success.main">
                      85%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Present Students
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      2,420 out of 2,847 students
                    </Typography>
                  </Paper>
                  
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          textAlign: 'center',
                          backgroundColor: alpha(theme.palette.error.main, 0.08),
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="error.main">
                          10%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Absent (285)
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={6}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          textAlign: 'center',
                          backgroundColor: alpha(theme.palette.warning.main, 0.08),
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold" color="warning.main">
                          5%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          On Leave (142)
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
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
                    startIcon={<PersonAdd />}
                    onClick={() => navigate('/admin/users')}
                    sx={{ justifyContent: 'flex-start', py: { xs: 1, sm: 1.5 } }}
                  >
                    Add New User
                  </Button>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    size="small"
                    startIcon={<School />}
                    onClick={() => navigate('/admin/courses')}
                    sx={{ justifyContent: 'flex-start', py: { xs: 1, sm: 1.5 } }}
                  >
                    Manage Courses
                  </Button>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    size="small"
                    startIcon={<Payment />}
                    onClick={() => navigate('/admin/finance')}
                    sx={{ justifyContent: 'flex-start', py: { xs: 1, sm: 1.5 } }}
                  >
                    View Finances
                  </Button>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    size="small"
                    startIcon={<Assignment />}
                    onClick={() => navigate('/admin/reports')}
                    sx={{ justifyContent: 'flex-start', py: { xs: 1, sm: 1.5 } }}
                  >
                    Generate Report
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bottom Section - Enrollment & Revenue */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Monthly Enrollment Trend */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Monthly Enrollment
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      New student registrations per month
                    </Typography>
                  </Box>
                  <Chip label="2026" size="small" color="primary" />
                </Box>
                <Stack spacing={2}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => {
                    const value = [120, 150, 180, 220, 280, 320][idx];
                    const percentage = (value / 320) * 100;
                    return (
                      <Box key={month}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {month}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="primary.main">
                            {value} students
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={percentage} 
                          sx={{ 
                            height: 10, 
                            borderRadius: 5,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 5,
                              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                            }
                          }} 
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Revenue */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Monthly Revenue
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total revenue collected per month
                    </Typography>
                  </Box>
                  <Chip label="PKR" size="small" color="success" />
                </Box>
                <Stack spacing={2}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => {
                    const revenue = [6.5, 7.2, 6.8, 7.5, 8.1, 8.5][idx];
                    const percentage = (revenue / 8.5) * 100;
                    return (
                      <Box key={month}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {month}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            ₨{revenue}M
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={percentage} 
                          color="success"
                          sx={{ 
                            height: 10, 
                            borderRadius: 5,
                            backgroundColor: alpha(theme.palette.success.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 5,
                              background: `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
                            }
                          }} 
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Activities - Full Width */}
        <Grid container spacing={3}>
          <Grid size={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Recent Activities
                  </Typography>
                  <Button 
                    size="small" 
                    endIcon={<ArrowForward />}
                    sx={{ minWidth: { xs: 80, sm: 'auto' } }}
                  >
                    View All
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  {recentActivities.map((activity) => (
                    <Grid key={activity.id} size={{ xs: 12, sm: 6, md: 3 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          height: '100%',
                          transition: 'all 0.3s',
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: `${activity.status}.main`,
                            backgroundColor: alpha(theme.palette[activity.status].main, 0.02),
                            transform: 'translateY(-4px)',
                            boxShadow: theme.shadows[4],
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: `${activity.status}.main`,
                              mt: 0.5,
                              flexShrink: 0,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom noWrap>
                              {activity.title}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                mb: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {activity.description}
                            </Typography>
                            <Chip 
                              label={activity.time} 
                              size="small" 
                              sx={{ 
                                height: 20,
                                fontSize: '0.7rem',
                                backgroundColor: alpha(theme.palette[activity.status].main, 0.1),
                                color: `${activity.status}.main`,
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default AdminDashboard;
