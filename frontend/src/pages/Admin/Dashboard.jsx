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

import React, { useState, useEffect } from 'react';
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
  ChatBubbleOutline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from '../../contexts/SnackbarContext';
import StatCard from '../../components/Common/StatCard';
import PageHeader from '../../components/Common/PageHeader';
import { pageTransition } from '../../utils/animations';
import { analyticsAPI } from '../../api/analytics';
import { sisAPI } from '../../api/sis';
import { opsAPI } from '../../api/ops';
import { hrAPI } from '../../api/hr';

const AdminDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [anchorEl, setAnchorEl] = useState(null);

  const [stats, setStats] = useState([
    { title: 'Total Students', value: '—', subtitle: 'Loading...', icon: People, color: 'primary', tooltip: '' },
    { title: 'Faculty Members', value: '—', subtitle: 'Loading...', icon: School, color: 'success', tooltip: '' },
    { title: 'Active Sections', value: '—', subtitle: 'Loading...', icon: Assignment, color: 'info', tooltip: '' },
    { title: 'Revenue (Total)', value: '—', subtitle: 'Loading...', icon: AccountBalance, color: 'warning', tooltip: '' },
  ]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [monthlyEnrollment, setMonthlyEnrollment] = useState([0, 0, 0, 0, 0, 0]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([0, 0, 0, 0, 0, 0]);
  const [pendingApprovals, setPendingApprovals] = useState([
    { type: 'Pending Leaves', count: 0, icon: EventAvailable, path: '/admin/hr' },
    { type: 'Open Grievances', count: 0, icon: ChatBubbleOutline, path: '/admin/grievances' },
    { type: 'Red Risk Students', count: 0, icon: Warning, path: '/admin/reports' },
    { type: 'Unpaid Invoices', count: 0, icon: Payment, path: '/admin/finance' },
  ]);
  const [attendanceSnapshot, setAttendanceSnapshot] = useState({ percentage: 0, present: 0, total: 0 });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, deptRes, facultyRes, annRes, leavesRes, grievancesRes] = await Promise.allSettled([
          analyticsAPI.getAdminDashboard(),
          sisAPI.getDepartments(),
          sisAPI.getFaculty(),
          opsAPI.getAnnouncements({ limit: 6 }),
          hrAPI.getPendingLeaves(),
          opsAPI.getGrievances({ status: 'Open' }),
        ]);

        if (dashRes.status === 'fulfilled') {
          const d = dashRes.value.data;
          if (d) {
            const facultyCount = facultyRes.status === 'fulfilled'
              ? (Array.isArray(facultyRes.value.data) ? facultyRes.value.data.length : (facultyRes.value.data?.faculty || []).length)
              : 0;

            setStats([
              { title: 'Total Students', value: String(d.total_students ?? 0), subtitle: `${d.active_students ?? 0} active students`, icon: People, color: 'primary', tooltip: 'Total student profiles registered' },
              { title: 'Faculty Members', value: String(facultyCount), subtitle: 'Active staff members', icon: School, color: 'success', tooltip: 'Total teaching faculty records' },
              { title: 'Active Sections', value: String(d.total_sections ?? 0), subtitle: 'Current semester courses', icon: Assignment, color: 'info', tooltip: 'Live teaching sections for Spring 2026' },
              { title: 'Revenue (Collected)', value: `₨ ${(Number(d?.revenue?.total_collected || 0) / 1000000).toFixed(1)}M`, subtitle: `Out: ₨ ${(Number(d?.revenue?.outstanding || 0) / 1000000).toFixed(1)}M`, icon: AccountBalance, color: 'warning', tooltip: 'Total revenue collected this session' },
            ]);

            setAttendanceSnapshot({
              percentage: Number(d?.attendance?.attendance_pct || 0),
              present: Number(d?.attendance?.present_count || 0),
              total: Number(d?.attendance?.total_records || 0),
            });

            const pendingLeaves = leavesRes.status === 'fulfilled' ? (Array.isArray(leavesRes.value.data) ? leavesRes.value.data.length : 0) : 0;
            const openGrievances = grievancesRes.status === 'fulfilled' ? (Array.isArray(grievancesRes.value.data) ? grievancesRes.value.data.length : 0) : 0;

            setPendingApprovals([
              { type: 'Pending Leaves', count: pendingLeaves, icon: EventAvailable, path: '/admin/hr' },
              { type: 'Open Grievances', count: openGrievances, icon: ChatBubbleOutline, path: '/admin/grievances' },
              { type: 'Red Risk Students', count: Number(d?.at_risk_summary?.red || 0), icon: Warning, path: '/admin/reports' },
              { type: 'Unpaid Invoices', count: Number(d?.revenue?.unpaid_student_count || 0), icon: Payment, path: '/admin/finance' },
            ]);

            if (d.monthly_enrollment) {
              setMonthlyEnrollment(d.monthly_enrollment);
            }
            if (d.monthly_revenue) {
              setMonthlyRevenue(d.monthly_revenue);
            }
          }
        }

        if (deptRes.status === 'fulfilled') {
          const depts = deptRes.value.data?.departments || deptRes.value.data || [];
          setDepartments(depts.slice(0, 4).map(dp => ({ 
            name: dp.name, 
            students: dp.students ?? 0, 
            faculty: dp.faculty ?? 0, 
            courses: dp.courses ?? 0, 
            growth: dp.growth ?? 0 
          })));
        }

        if (annRes.status === 'fulfilled') {
          const rows = annRes.value.data?.announcements || annRes.value.data || [];
          setRecentActivities((Array.isArray(rows) ? rows : []).slice(0, 6).map((row) => ({
            id: row.announcement_id || row.id,
            title: row.title || 'Announcement',
            description: row.content || row.description || '',
            timestamp: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Just now',
            status: row.is_active === false ? 'warning' : 'info',
          })));
        }
      } catch (e) { 
        console.error('Dashboard data fetch error:', e); 
      }
    };
    fetchDashboard();
  }, []);


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
                          onClick={() => item.path && navigate(item.path)}
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
                      {Math.round(attendanceSnapshot.percentage)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Present Students
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {attendanceSnapshot.present} out of {attendanceSnapshot.total} records
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
                          {Math.max(0, Math.round(100 - attendanceSnapshot.percentage))}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Absent ({Math.max(0, attendanceSnapshot.total - attendanceSnapshot.present)})
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
                          {attendanceSnapshot.total > 0 ? Math.round((Math.max(0, attendanceSnapshot.total - attendanceSnapshot.present) / attendanceSnapshot.total) * 100) : 0}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Needs Attention
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
                    const value = monthlyEnrollment[idx] ?? 0;
                    const maxEnrollment = Math.max(...monthlyEnrollment, 1);
                    const percentage = (value / maxEnrollment) * 100;
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
                    const revenue = monthlyRevenue[idx] ?? 0;
                    const maxRevenue = Math.max(...monthlyRevenue, 1);
                    const percentage = (revenue / maxRevenue) * 100;
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
                    onClick={() => navigate('/notifications')}
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
                              label={activity.timestamp} 
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
