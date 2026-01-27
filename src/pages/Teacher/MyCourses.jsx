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

const TeacherCourses = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  const courses = [
    {
      id: 'CS101',
      code: 'CS101',
      name: 'Data Structures & Algorithms',
      semester: 'Fall 2025',
      students: 85,
      schedule: 'Mon, Wed, Fri - 9:00 AM',
      room: 'Lab 301',
      creditHours: 3,
      attendance: 88,
      assignments: 12,
      quizzes: 5,
      avgGrade: 'B+',
      status: 'ongoing',
    },
    {
      id: 'CS202',
      code: 'CS202',
      name: 'Database Management Systems',
      semester: 'Fall 2025',
      students: 92,
      schedule: 'Tue, Thu - 11:00 AM',
      room: 'Room 205',
      creditHours: 4,
      attendance: 92,
      assignments: 8,
      quizzes: 4,
      avgGrade: 'A-',
      status: 'ongoing',
    },
    {
      id: 'CS303',
      code: 'CS303',
      name: 'Web Engineering',
      semester: 'Fall 2025',
      students: 135,
      schedule: 'Mon, Wed - 2:00 PM',
      room: 'Lab 102',
      creditHours: 3,
      attendance: 85,
      assignments: 6,
      quizzes: 3,
      avgGrade: 'B',
      status: 'ongoing',
    },
    {
      id: 'CS404',
      code: 'CS404',
      name: 'Artificial Intelligence',
      semester: 'Fall 2025',
      students: 65,
      schedule: 'Tue, Thu - 3:30 PM',
      room: 'Room 401',
      creditHours: 3,
      attendance: 90,
      assignments: 10,
      quizzes: 4,
      avgGrade: 'A',
      status: 'ongoing',
    },
  ];

  const archivedCourses = [
    {
      id: 'CS202-SPRING',
      code: 'CS202',
      name: 'Database Management Systems',
      semester: 'Spring 2025',
      students: 88,
      avgGrade: 'B+',
      status: 'completed',
    },
  ];

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
