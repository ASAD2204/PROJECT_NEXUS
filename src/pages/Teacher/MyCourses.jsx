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
import { pageTransition } from '../../utils/animations';

const TeacherCourses = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  const courses = [
    {
      id: 1,
      code: 'CS-301',
      name: 'Data Structures & Algorithms',
      semester: 'Fall 2025',
      students: 85,
      schedule: 'Mon, Wed 9:00 AM',
      room: 'Lab 3',
      creditHours: 3,
      attendance: 88,
      assignments: 12,
      quizzes: 5,
      avgGrade: 'B+',
      status: 'ongoing',
    },
    {
      id: 2,
      code: 'CS-201',
      name: 'Object Oriented Programming',
      semester: 'Fall 2025',
      students: 92,
      schedule: 'Tue, Thu 11:00 AM',
      room: 'Lab 2',
      creditHours: 4,
      attendance: 92,
      assignments: 8,
      quizzes: 4,
      avgGrade: 'A-',
      status: 'ongoing',
    },
    {
      id: 3,
      code: 'CS-101',
      name: 'Introduction to Computing',
      semester: 'Fall 2025',
      students: 135,
      schedule: 'Mon, Wed, Fri 2:00 PM',
      room: 'Room 201',
      creditHours: 3,
      attendance: 85,
      assignments: 6,
      quizzes: 3,
      avgGrade: 'B',
      status: 'ongoing',
    },
    {
      id: 4,
      code: 'CS-401',
      name: 'Machine Learning',
      semester: 'Fall 2025',
      students: 65,
      schedule: 'Tue, Thu 2:00 PM',
      room: 'Lab 4',
      creditHours: 3,
      attendance: 90,
      assignments: 10,
      quizzes: 4,
      avgGrade: 'A',
      status: 'ongoing',
    },
    {
      id: 5,
      code: 'CS-501',
      name: 'Artificial Intelligence',
      semester: 'Fall 2025',
      students: 45,
      schedule: 'Mon, Wed 11:00 AM',
      room: 'Lab 5',
      creditHours: 3,
      attendance: 91,
      assignments: 9,
      quizzes: 4,
      avgGrade: 'A-',
      status: 'ongoing',
    },
  ];

  const archivedCourses = [
    {
      id: 6,
      code: 'CS-201',
      name: 'Object Oriented Programming',
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
          variant="outlined"
          size="small"
          startIcon={<Visibility />}
          onClick={() => navigate(`/teacher/course/${course.id}`)}
        >
          View Details
        </Button>
        <Button fullWidth variant="contained" size="small" startIcon={<Edit />}>
          Manage
        </Button>
      </Stack>
    </Paper>
  );

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="My Courses"
          subtitle="Manage your courses, assignments, and student performance"
          action={
            <Button startIcon={<Add />} variant="contained" onClick={() => setOpenDialog(true)}>
              Add Content
            </Button>
          }
        />

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Active Courses
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {courses.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Total Students
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {courses.reduce((sum, c) => sum + c.students, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Pending Assignments
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  23
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Avg Attendance
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  89%
                </Typography>
              </CardContent>
            </Card>
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
