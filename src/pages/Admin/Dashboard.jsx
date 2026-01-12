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
      change: '+12.5%',
      trend: 'up',
      icon: People,
      color: theme.palette.primary.main,
    },
    {
      title: 'Faculty Members',
      value: '186',
      change: '+3.2%',
      trend: 'up',
      icon: School,
      color: theme.palette.success.main,
    },
    {
      title: 'Active Courses',
      value: '342',
      change: '+8.1%',
      trend: 'up',
      icon: Assignment,
      color: theme.palette.info.main,
    },
    {
      title: 'Revenue (This Month)',
      value: '₨ 8.5M',
      change: '+15.3%',
      trend: 'up',
      icon: AccountBalance,
      color: theme.palette.warning.main,
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
                change={stat.change}
                trend={stat.trend}
                icon={stat.icon}
                color={stat.color}
              />
            </Grid>
          ))}
        </Grid>

        {/* Enrollment & Attendance Overview */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Enrollment Overview */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Enrollment Overview
                  </Typography>
                  <Button size="small" endIcon={<ArrowForward />}>
                    View Details
                  </Button>
                </Box>
                <Stack spacing={2}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => {
                    const value = [120, 150, 180, 220, 280, 320][idx];
                    return (
                      <Box key={month}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{month}</Typography>
                          <Typography variant="body2" fontWeight="bold">{value} students</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={(value / 320) * 100} sx={{ height: 8, borderRadius: 4 }} />
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Attendance Overview */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Today's Attendance
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={4}>
                    <Paper elevation={0} sx={{ p: 2, textAlign: 'center', backgroundColor: alpha(theme.palette.success.main, 0.1) }}>
                      <Typography variant="h4" fontWeight="bold" color="success.main">85%</Typography>
                      <Typography variant="caption" color="text.secondary">Present</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={4}>
                    <Paper elevation={0} sx={{ p: 2, textAlign: 'center', backgroundColor: alpha(theme.palette.error.main, 0.1) }}>
                      <Typography variant="h4" fontWeight="bold" color="error.main">10%</Typography>
                      <Typography variant="caption" color="text.secondary">Absent</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={4}>
                    <Paper elevation={0} sx={{ p: 2, textAlign: 'center', backgroundColor: alpha(theme.palette.warning.main, 0.1) }}>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">5%</Typography>
                      <Typography variant="caption" color="text.secondary">Leave</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Revenue & Department Overview */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Revenue Overview */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Monthly Revenue
                </Typography>
                <Stack spacing={1.5}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => {
                    const revenue = [6.5, 7.2, 6.8, 7.5, 8.1, 8.5][idx];
                    return (
                      <Box key={month} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">{month}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mx: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={(revenue / 8.5) * 100} 
                            sx={{ flex: 1, height: 6, borderRadius: 3 }} 
                          />
                        </Box>
                        <Typography variant="body2" fontWeight="bold">₨{revenue}M</Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Departments Overview */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Departments Overview
                  </Typography>
                  <IconButton size="small">
                    <MoreVert />
                  </IconButton>
                </Box>
                <Stack spacing={2}>
                  {departments.map((dept, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: 2,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {dept.name}
                        </Typography>
                        <Chip
                          label={`+${dept.growth}%`}
                          size="small"
                          color="success"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid size={4}>
                          <Typography variant="caption" color="text.secondary">
                            Students
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {dept.students}
                          </Typography>
                        </Grid>
                        <Grid size={4}>
                          <Typography variant="caption" color="text.secondary">
                            Faculty
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {dept.faculty}
                          </Typography>
                        </Grid>
                        <Grid size={4}>
                          <Typography variant="caption" color="text.secondary">
                            Courses
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {dept.courses}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Pending Approvals & Recent Activities */}
        <Grid container spacing={3}>
          {/* Pending Approvals */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Pending Approvals
                </Typography>
                <Grid container spacing={2}>
                  {pendingApprovals.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Grid key={index} size={{ xs: 12, sm: 6 }}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            backgroundColor: alpha(theme.palette.warning.main, 0.08),
                            borderLeft: 4,
                            borderColor: theme.palette.warning.main,
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.warning.main, 0.12),
                              transform: 'translateY(-2px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                              <Icon />
                            </Avatar>
                            <Box>
                              <Typography variant="h5" fontWeight="bold">
                                {item.count}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.type}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activities */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                  Recent Activities
                </Typography>
                <Stack spacing={2}>
                  {recentActivities.map((activity) => (
                    <Box
                      key={activity.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          backgroundColor: alpha(theme.palette.primary.main, 0.02),
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: `${activity.status}.main`,
                            mt: 1,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            {activity.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {activity.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.time}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default AdminDashboard;
