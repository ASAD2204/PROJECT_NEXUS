import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Button,
  CircularProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  CardMedia,
  IconButton,
  Divider,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import { DashboardSkeleton } from '../../components/Common/LoadingSkeleton';
import {
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Payment as PaymentIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward,
  HowToReg,
  Description,
  Receipt,
  FiberManualRecord,
  Announcement as AnnouncementIcon,
  AccessTime,
  CheckCircleOutline,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import {
  courses,
  assignments,
  feeInvoices,
  gpaHistory,
  attendanceStats,
  announcements,
  currentUser,
} from '../../data/dummyData';
import StatCard from '../../components/Common/StatCard';
import { pageTransition, staggerContainer, fadeInUp } from '../../utils/animations';

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [sectionsLoaded, setSectionsLoaded] = useState([]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate loading with stagger animation
  useEffect(() => {
    // Initial loading delay
    const loadTimer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    // Stagger section animations
    const sections = ['header', 'stats', 'charts', 'schedule', 'courses', 'activities', 'announcements'];
    sections.forEach((section, index) => {
      setTimeout(() => {
        setSectionsLoaded(prev => [...prev, section]);
      }, 1000 + (index * 100));
    });

    return () => clearTimeout(loadTimer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDateTime = () => {
    return currentTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const pendingAssignments = assignments.filter((a) => a.status === 'Pending').length;
  const unpaidFees = feeInvoices.filter((f) => f.status === 'Unpaid' || f.status === 'Overdue');
  const totalUnpaid = unpaidFees.reduce((sum, f) => sum + f.amount, 0);

  // Mock attendance data by course
  const attendanceData = [
    { course: 'CS101', percentage: 90, color: '#388E3C' },
    { course: 'CS202', percentage: 85, color: '#388E3C' },
    { course: 'CS303', percentage: 75, color: '#F57C00' },
    { course: 'CS404', percentage: 92, color: '#388E3C' },
  ];

  // Mock today's schedule
  const todaysSchedule = [
    { time: '09:00 AM', course: 'CS101', title: 'Data Structures', room: 'Lab 301', faculty: 'Dr. Sarah Ahmed', status: 'completed' },
    { time: '11:00 AM', course: 'CS202', title: 'Database Management', room: 'Room 205', faculty: 'Prof. Ali Raza', status: 'current' },
    { time: '02:00 PM', course: 'CS303', title: 'Web Engineering', room: 'Lab 102', faculty: 'Dr. Fatima Malik', status: 'upcoming' },
    { time: '04:00 PM', course: 'CS404', title: 'Artificial Intelligence', room: 'Room 310', faculty: 'Dr. Hassan Khan', status: 'upcoming' },
  ];

  // Mock recent activities
  const recentActivities = [
    { icon: CheckCircleIcon, color: 'success', description: 'Marked attendance for CS101', time: '2 hours ago' },
    { icon: AssignmentIcon, color: 'primary', description: 'Submitted Database Normalization assignment', time: '5 hours ago' },
    { icon: PaymentIcon, color: 'warning', description: 'Fee invoice generated for Fall 2025', time: '1 day ago' },
    { icon: SchoolIcon, color: 'info', description: 'Enrolled in Artificial Intelligence course', time: '2 days ago' },
    { icon: Description, color: 'secondary', description: 'Downloaded transcript for Semester 6', time: '3 days ago' },
  ];

  const isLoaded = (section) => sectionsLoaded.includes(section);

  return (
    <motion.div {...pageTransition}>
    <Box className="page-container">
      {/* 1. HEADER SECTION */}
      <Card 
        sx={{ 
          mb: 3, 
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1E1E1E 0%, #2A2A2A 100%)'
            : 'linear-gradient(135deg, #1976D2 0%, #00796B 100%)',
          color: theme.palette.mode === 'dark' ? 'text.primary' : 'white',
          opacity: isLoaded('header') ? 1 : 0,
          animation: isLoaded('header') ? 'fadeIn 0.3s ease-in-out' : 'none',
        }}
      >
        <CardContent sx={{ py: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {getGreeting()}, {currentUser.name.split(' ')[0]}! 👋
              </Typography>
              <Typography variant="body1" sx={{ opacity: theme.palette.mode === 'dark' ? 0.85 : 0.9 }}>
                {formatDateTime()}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  variant="contained"
                  startIcon={<HowToReg />}
                  onClick={() => navigate('/attendance')}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                    '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.2)' : 'rgba(255, 255, 255, 0.2)' },
                  }}
                >
                  Mark Attendance
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AssignmentIcon />}
                  onClick={() => navigate('/lms')}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                    '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.2)' : 'rgba(255, 255, 255, 0.2)' },
                  }}
                >
                  Submit Assignment
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PaymentIcon />}
                  onClick={() => navigate('/finance')}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                    '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.2)' : 'rgba(255, 255, 255, 0.2)' },
                  }}
                >
                  Pay Fees
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 2. STATISTICS GRID */}
      <Grid
        container
        spacing={3}
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        sx={{ mb: 3 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="CGPA"
            value={currentUser.cgpa}
            icon={TrendingUpIcon}
            color="primary"
            trend={{ direction: 'up', value: '+0.05' }}
            subtitle="Last Semester: 3.92"
            tooltip="Cumulative Grade Point Average across all completed semesters. Higher CGPA indicates better overall academic performance."
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Attendance"
            value={`${attendanceStats.percentage}%`}
            icon={HowToReg}
            color="success"
            subtitle={`${attendanceStats.attended}/${attendanceStats.totalClasses} classes`}
            tooltip="Overall attendance percentage. Maintain above 75% to avoid attendance shortage issues."
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Pending Tasks"
            value={pendingAssignments}
            icon={AssignmentIcon}
            color="warning"
            subtitle={`${assignments.length} total assignments`}
            tooltip="Number of assignments pending submission. Complete them before the deadline to avoid penalties."
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <StatCard
            title="Fee Status"
            value={unpaidFees.length > 0 ? `PKR ${totalUnpaid.toLocaleString()}` : 'All Paid'}
            icon={PaymentIcon}
            color={unpaidFees.length > 0 ? 'error' : 'success'}
            subtitle={unpaidFees.length > 0 ? `${unpaidFees.length} invoice(s) due` : 'No pending fees'}
            tooltip={unpaidFees.length > 0 ? 'Outstanding fee amount that needs to be paid. Click to view fee vouchers.' : 'All your fees are paid up to date!'}
            loading={loading}
            onClick={() => navigate('/finance/fee-vouchers')}
          />
        </Grid>
      </Grid>

      {/* 3. CHARTS ROW */}
      <Grid 
        container 
        spacing={3} 
        sx={{ 
          mb: 3,
          opacity: isLoaded('charts') ? 1 : 0,
          animation: isLoaded('charts') ? 'fadeIn 0.3s ease-in-out' : 'none',
        }}
      >
        {/* GPA Trend Chart - Full Width */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, rgba(25,118,210,0.05) 0%, rgba(21,101,192,0.05) 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            transition: 'all 0.3s ease',
            '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Academic Performance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    GPA trend over 7 semesters
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label="7 Semesters" size="small" color="primary" variant="outlined" />
                  <TrendingUpIcon sx={{ color: 'success.main', fontSize: 32 }} />
                </Stack>
              </Box>
              {loading ? (
                <Skeleton variant="rectangular" height={430} sx={{ borderRadius: 2 }} />
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart data={gpaHistory} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976D2" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#1976D2" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.5} />
                    <XAxis 
                      dataKey="semester" 
                      stroke="#666" 
                      style={{ fontSize: '0.75rem' }}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      domain={[0, 4.0]} 
                      stroke="#666" 
                      style={{ fontSize: '0.75rem' }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="gpa"
                      stroke="#1976D2"
                      strokeWidth={3}
                      fill="url(#colorGpa)"
                      dot={{ fill: '#1976D2', r: 5, strokeWidth: 2, stroke: 'white' }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Attendance Overview Chart - Full Width */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(67,160,71,0.05) 100%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            transition: 'all 0.3s ease',
            '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }
          }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Attendance Overview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Course-wise attendance percentage
                  </Typography>
                </Box>
                <Chip label="Current Semester" size="small" color="success" variant="outlined" />
              </Stack>
              {loading ? (
                <Skeleton variant="rectangular" height={430} sx={{ borderRadius: 2 }} />
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="attendanceBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4caf50" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#2e7d32" stopOpacity={0.7}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.5} />
                    <XAxis 
                      dataKey="course" 
                      stroke="#666" 
                      style={{ fontSize: '0.7rem' }}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke="#666" 
                      style={{ fontSize: '0.75rem' }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                      cursor={{ fill: 'rgba(76,175,80,0.1)' }}
                    />
                    <Bar 
                      dataKey="percentage"
                      fill="url(#attendanceBarGradient)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={50}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 4. TODAY'S SCHEDULE + 5. ACTIVE COURSES */}
      <Grid 
        container 
        spacing={3} 
        sx={{ 
          mb: 3,
          opacity: isLoaded('schedule') ? 1 : 0,
          animation: isLoaded('schedule') ? 'fadeIn 0.3s ease-in-out' : 'none',
        }}
      >
        {/* TODAY'S SCHEDULE */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Today's Classes
              </Typography>
              {todaysSchedule.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No classes today! 📚
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Time to catch up on assignments
                  </Typography>
                </Box>
              ) : (
                <Timeline position="right" sx={{ mt: 2, p: 0 }}>
                  {todaysSchedule.map((classItem, index) => (
                    <TimelineItem key={index}>
                      <TimelineOppositeContent sx={{ flex: 0.3, py: 2 }}>
                        <Typography variant="body2" fontWeight={600} color={classItem.status === 'current' ? 'primary.main' : 'text.secondary'}>
                          {classItem.time}
                        </Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot 
                          color={
                            classItem.status === 'completed' ? 'success' :
                            classItem.status === 'current' ? 'primary' :
                            'grey'
                          }
                          sx={{
                            animation: classItem.status === 'current' ? 'pulse 2s infinite' : 'none',
                            '@keyframes pulse': {
                              '0%': {
                                boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.7)',
                              },
                              '70%': {
                                boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)',
                              },
                              '100%': {
                                boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)',
                              },
                            },
                          }}
                        >
                          {classItem.status === 'completed' ? (
                            <CheckCircleOutline sx={{ fontSize: 20 }} />
                          ) : classItem.status === 'current' ? (
                            <FiberManualRecord sx={{ fontSize: 20 }} />
                          ) : (
                            <RadioButtonUnchecked sx={{ fontSize: 20 }} />
                          )}
                        </TimelineDot>
                        {index < todaysSchedule.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ py: 2 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: classItem.status === 'completed' ? 'action.hover' : 
                                           classItem.status === 'current' ? 'primary.light' : 
                                           'background.default',
                            opacity: classItem.status === 'completed' ? 0.6 : 1,
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight="bold">
                            {classItem.course} - {classItem.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {classItem.room} • {classItem.faculty}
                          </Typography>
                        </Box>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ACTIVE COURSES */}
        <Grid 
          size={{ xs: 12, lg: 7 }}
          sx={{
            opacity: isLoaded('courses') ? 1 : 0,
            animation: isLoaded('courses') ? 'fadeIn 0.3s ease-in-out' : 'none',
          }}
        >
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Active Courses
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/lms')}
                >
                  View All
                </Button>
              </Box>
              <Grid container spacing={2}>
                {courses.slice(0, 3).map((course) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
                    <Card 
                      className="hover-lift"
                      sx={{ 
                        cursor: 'pointer',
                        height: '100%',
                      }}
                      onClick={() => navigate(`/lms/course/${course.id}`)}
                    >
                      <CardMedia
                        component="img"
                        height="120"
                        image={course.coverImage}
                        alt={course.title}
                      />
                      <CardContent sx={{ p: 2 }}>
                        <Chip 
                          label={course.code} 
                          size="small" 
                          color="primary" 
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom noWrap>
                          {course.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar 
                            src={course.instructorPhoto} 
                            sx={{ width: 24, height: 24, mr: 1 }} 
                          />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {course.instructor}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Progress
                          </Typography>
                          <Typography variant="caption" fontWeight="bold" color="primary">
                            {course.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={course.progress}
                          sx={{ height: 6, borderRadius: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 6. RECENT ACTIVITIES + 7. ANNOUNCEMENTS */}
      <Grid container spacing={3}>
        {/* RECENT ACTIVITIES */}
        <Grid 
          size={{ xs: 12, md: 7 }}
          sx={{
            opacity: isLoaded('activities') ? 1 : 0,
            animation: isLoaded('activities') ? 'fadeIn 0.3s ease-in-out' : 'none',
          }}
        >
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Activities
              </Typography>
              <List sx={{ pt: 2 }}>
                {recentActivities.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <React.Fragment key={index}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: `${activity.color}.light`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon sx={{ fontSize: 20, color: `${activity.color}.main` }} />
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={activity.description}
                          secondary={activity.time}
                          primaryTypographyProps={{
                            fontWeight: 500,
                            fontSize: '0.95rem',
                          }}
                          secondaryTypographyProps={{
                            fontSize: '0.8rem',
                          }}
                        />
                      </ListItem>
                      {index < recentActivities.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* ANNOUNCEMENTS */}
        <Grid 
          size={{ xs: 12, md: 5 }}
          sx={{
            opacity: isLoaded('announcements') ? 1 : 0,
            animation: isLoaded('announcements') ? 'fadeIn 0.3s ease-in-out' : 'none',
          }}
        >
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AnnouncementIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Announcements
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {announcements.slice(0, 2).map((announcement) => (
                  <Card 
                    key={announcement.id}
                    variant="outlined"
                    className="hover-lift"
                    sx={{ 
                      cursor: 'pointer',
                      borderLeft: `4px solid`,
                      borderLeftColor: 
                        announcement.type === 'Important' ? 'error.main' :
                        announcement.type === 'Exam' ? 'warning.main' :
                        'info.main',
                    }}
                    onClick={() => navigate(`/lms/course/${announcement.courseId}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Chip 
                          label={announcement.type} 
                          size="small" 
                          color={
                            announcement.type === 'Important' ? 'error' :
                            announcement.type === 'Exam' ? 'warning' :
                            'info'
                          }
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTime sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(announcement.postedOn).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        {announcement.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {announcement.content.substring(0, 80)}...
                      </Typography>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                        Read More →
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => navigate('/lms')}
              >
                View All Announcements
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
    </motion.div>
  );
};

export default Dashboard;
