/**
 * My Courses Page - Teacher View
 * 
 * Displays all courses taught by the teacher with detailed statistics.
 * Allows teachers to manage course content and view course details.
 * 
 * Features:
 * - Statistics cards (active courses, total students, pending assignments, avg attendance)
 * - Tabbed interface for active and archived courses
 * - Course cards with enrollment, schedule, and performance data
 * - Attendance progress indicators
 * - Quick access to course management interface
 * - Responsive grid layout
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
  Tab,
  Tabs,
  LinearProgress,
  IconButton,
  Tooltip,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  School,
  People,
  Assignment,
  Schedule,
  Add,
  Edit,
  Visibility,
  Download,
  CheckCircle,
  MoreVert,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { pageTransition, fadeInUp, staggerContainer } from '../../utils/animations';
import { teacherAPI } from '../../api/teacher';

const TeacherCourses = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [courses, setCourses] = useState([]);
  const [archivedCourses, setArchivedCourses] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await teacherAPI.getMyCourses();
        const all = res.data?.courses || res.data || [];
        setCourses(all.filter(c => c.status !== 'completed'));
        setArchivedCourses(all.filter(c => c.status === 'completed'));
      } catch (e) { console.error('Failed to load courses', e); }
    };
    fetchCourses();
  }, []);

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 75) return 'warning';
    return 'error';
  };

  const CourseCard = ({ course }) => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        height: '100%',
        transition: 'all 0.3s',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              width: 56,
              height: 56,
            }}
          >
            <School fontSize="large" />
          </Avatar>
          <Box>
            <Chip label={course.code} size="small" color="primary" sx={{ mb: 0.5 }} />
            <Typography variant="h6" fontWeight="bold">
              {course.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {course.semester} • {course.creditHours} Credit Hours
            </Typography>
          </Box>
        </Box>
        <IconButton size="small">
          <MoreVert />
        </IconButton>
      </Box>

      <Stack spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <People fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {course.students} Students Enrolled
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {course.schedule}
          </Typography>
        </Box>
        {course.room && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Room: {course.room}
            </Typography>
          </Box>
        )}
      </Stack>

      {course.status === 'ongoing' && (
        <>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              mb: 2,
            }}
          >
            <Grid container spacing={2}>
              <Grid size={4}>
                <Typography variant="caption" color="text.secondary">
                  Assignments
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {course.assignments}
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="caption" color="text.secondary">
                  Quizzes
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {course.quizzes}
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="caption" color="text.secondary">
                  Avg Grade
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {course.avgGrade}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Attendance Rate
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {course.attendance}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={course.attendance}
              color={getAttendanceColor(course.attendance)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </>
      )}

      <Stack direction="row" spacing={1}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Edit />}
          onClick={() => navigate(`/teacher/course/${course.id}/manage`)}
          sx={{ py: 1 }}
        >
          Manage Course
        </Button>
      </Stack>
    </Paper>
  );

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          icon={School}
          title="My Courses"
          subtitle="Manage your courses, assignments, and student performance"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />

        {/* Stats */}
        <Grid 
          container 
          spacing={3} 
          sx={{ mb: 3 }}
          component={motion.div}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <StatCard
              title="Active Courses"
              value={courses.length}
              icon={School}
              color="primary"
              tooltip="Total number of courses you are teaching this semester"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <StatCard
              title="Total Students"
              value={courses.reduce((sum, c) => sum + c.students, 0)}
              icon={People}
              color="success"
              tooltip="Total number of students enrolled across all your courses"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <StatCard
              title="Pending Assignments"
              value="23"
              icon={Assignment}
              color="warning"
              tooltip="Assignments awaiting your review and grading"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
            <StatCard
              title="Avg Attendance"
              value="89%"
              icon={CheckCircle}
              color="info"
              tooltip="Average attendance rate across all your courses"
            />
          </Grid>
        </Grid>

        <Card>
          <CardContent>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                <Tab label={`Active Courses (${courses.length})`} />
                <Tab label={`Archived (${archivedCourses.length})`} />
              </Tabs>
            </Box>

            {/* Course Grid */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                {courses.map((course) => (
                  <Grid key={course.id} size={{ xs: 12, md: 6, lg: 4 }}>
                    <CourseCard course={course} />
                  </Grid>
                ))}
              </Grid>
            )}

            {activeTab === 1 && (
              <Grid container spacing={3}>
                {archivedCourses.map((course) => (
                  <Grid key={course.id} size={{ xs: 12, md: 6, lg: 4 }}>
                    <CourseCard course={course} />
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* Add Content Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Content</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Button variant="outlined" fullWidth startIcon={<Assignment />}>
                Create Assignment
              </Button>
              <Button variant="outlined" fullWidth startIcon={<Assignment />}>
                Create Quiz
              </Button>
              <Button variant="outlined" fullWidth startIcon={<Download />}>
                Upload Material
              </Button>
              <Button variant="outlined" fullWidth startIcon={<CheckCircle />}>
                Mark Attendance
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default TeacherCourses;
