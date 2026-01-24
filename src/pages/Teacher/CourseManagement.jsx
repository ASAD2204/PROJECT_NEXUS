import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Stack,
  Paper,
  IconButton,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Menu,
  MenuItem,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack,
  School,
  People,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Campaign,
  Settings,
  Add,
  Edit,
  Delete,
  MoreVert,
  FileUpload,
  Download,
  CheckCircle,
  Schedule,
  Visibility,
  AttachFile,
  Send,
  Person,
  Email,
  Phone,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import { fadeInUp, staggerContainer } from '../../utils/animations';

const CourseManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'assignment', 'material', 'announcement', 'student'
  const [anchorEl, setAnchorEl] = useState(null);

  // Mock course data
  const course = {
    id: id,
    code: 'CS-301',
    name: 'Data Structures & Algorithms',
    semester: 'Fall 2025',
    students: 85,
    schedule: 'Mon, Wed 9:00 AM',
    room: 'Lab 3',
    creditHours: 3,
    description: 'This course covers fundamental data structures and algorithms including arrays, linked lists, stacks, queues, trees, graphs, searching and sorting algorithms.',
  };

  const students = [
    {
      id: 1,
      name: 'Muhammad Asad',
      rollNo: 'BSCS-2023-001',
      email: 'asad@student.edu.pk',
      phone: '+92-300-1234567',
      avatar: 'https://i.pravatar.cc/150?img=12',
      attendance: 88,
      assignments: 10,
      quizzes: 4,
      avgGrade: 'B+',
    },
    {
      id: 2,
      name: 'Ayesha Khan',
      rollNo: 'BSCS-2023-002',
      email: 'ayesha@student.edu.pk',
      phone: '+92-300-2234567',
      avatar: 'https://i.pravatar.cc/150?img=5',
      attendance: 95,
      assignments: 12,
      quizzes: 5,
      avgGrade: 'A',
    },
    {
      id: 3,
      name: 'Ali Ahmed',
      rollNo: 'BSCS-2023-003',
      email: 'ali@student.edu.pk',
      phone: '+92-300-3234567',
      avatar: 'https://i.pravatar.cc/150?img=8',
      attendance: 76,
      assignments: 8,
      quizzes: 3,
      avgGrade: 'C+',
    },
    {
      id: 4,
      name: 'Fatima Zahra',
      rollNo: 'BSCS-2023-004',
      email: 'fatima@student.edu.pk',
      phone: '+92-300-4234567',
      avatar: 'https://i.pravatar.cc/150?img=10',
      attendance: 92,
      assignments: 11,
      quizzes: 5,
      avgGrade: 'A-',
    },
  ];

  const assignments = [
    {
      id: 1,
      title: 'Binary Search Tree Implementation',
      type: 'Lab Assignment',
      dueDate: '2026-01-28',
      totalMarks: 100,
      submissions: 67,
      pending: 18,
      graded: 50,
      status: 'active',
    },
    {
      id: 2,
      title: 'Sorting Algorithms Analysis',
      type: 'Theory Assignment',
      dueDate: '2026-02-05',
      totalMarks: 50,
      submissions: 45,
      pending: 40,
      graded: 5,
      status: 'active',
    },
    {
      id: 3,
      title: 'Graph Traversal Lab',
      type: 'Lab Assignment',
      dueDate: '2026-01-15',
      totalMarks: 100,
      submissions: 85,
      pending: 0,
      graded: 85,
      status: 'closed',
    },
  ];

  const materials = [
    {
      id: 1,
      title: 'Week 5: Binary Search Trees',
      type: 'Lecture Slides',
      fileType: 'PDF',
      size: '2.5 MB',
      uploadedAt: '2026-01-20',
      downloads: 78,
    },
    {
      id: 2,
      title: 'BST Implementation Code',
      type: 'Code Sample',
      fileType: 'ZIP',
      size: '156 KB',
      uploadedAt: '2026-01-20',
      downloads: 65,
    },
    {
      id: 3,
      title: 'Data Structures Tutorial',
      type: 'Video Lecture',
      fileType: 'MP4',
      size: '125 MB',
      uploadedAt: '2026-01-18',
      downloads: 82,
    },
  ];

  const announcements = [
    {
      id: 1,
      title: 'Mid-term Exam Schedule',
      content: 'Mid-term exams will be held on January 28th at 9:00 AM in Lab 3. Please arrive 15 minutes early.',
      postedAt: '2026-01-22 10:30 AM',
      priority: 'high',
    },
    {
      id: 2,
      title: 'Office Hours Update',
      content: 'Office hours this week will be on Wednesday 2-4 PM instead of Tuesday.',
      postedAt: '2026-01-20 02:15 PM',
      priority: 'medium',
    },
  ];

  const handleOpenDialog = (type) => {
    setDialogType(type);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogType('');
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'PDF':
        return '📄';
      case 'ZIP':
        return '📦';
      case 'MP4':
        return '🎥';
      default:
        return '📎';
    }
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 75) return 'warning';
    return 'error';
  };

  return (
    <Box className="page-container">
      {/* HEADER */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/teacher/courses')}
          sx={{ mb: 2 }}
        >
          Back to Courses
        </Button>
        <PageHeader
          icon={School}
          title={`${course.code}: ${course.name}`}
          subtitle={`${course.semester} • ${course.students} Students • ${course.schedule} • ${course.room}`}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
      </Box>

      {/* STATS CARDS */}
      <Grid 
        container 
        spacing={3} 
        sx={{ mb: 4 }}
        component={motion.div}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {course.students}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enrolled Students
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <People sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {assignments.filter(a => a.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Assignments
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'warning.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AssignmentIcon sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {materials.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Course Materials
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'info.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AttachFile sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }} component={motion.div} variants={fadeInUp}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 0.5 }}>
                    88%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Attendance
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'success.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 24 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* TABS */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label="Students" />
          <Tab label="Assignments" />
          <Tab label="Materials" />
          <Tab label="Announcements" />
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* OVERVIEW TAB */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Course Description
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {course.description}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Add />}
                    onClick={() => navigate('/teacher/create-assignment')}
                    sx={{ py: 1.5 }}
                  >
                    Create Assignment
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<FileUpload />}
                    onClick={() => handleOpenDialog('material')}
                    sx={{ py: 1.5 }}
                  >
                    Upload Material
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Campaign />}
                    onClick={() => handleOpenDialog('announcement')}
                    sx={{ py: 1.5 }}
                  >
                    Post Announcement
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CheckCircle />}
                    onClick={() => navigate('/attendance/smart-attendance')}
                    sx={{ py: 1.5 }}
                  >
                    Mark Attendance
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Enrolled Students ({students.length})
                </Typography>
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  size="small"
                  onClick={() => handleOpenDialog('student')}
                >
                  Add Student
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Roll No</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell align="center">Attendance</TableCell>
                      <TableCell align="center">Assignments</TableCell>
                      <TableCell align="center">Avg Grade</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar src={student.avatar} alt={student.name} />
                            <Typography variant="body2" fontWeight={600}>
                              {student.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {student.rollNo}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {student.email}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {student.phone}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {student.attendance}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={student.attendance}
                              color={getAttendanceColor(student.attendance)}
                              sx={{ width: 60, mx: 'auto', height: 4, borderRadius: 2, mt: 0.5 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>
                            {student.assignments}/{assignments.length}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={student.avgGrade}
                            size="small"
                            color={
                              student.avgGrade.startsWith('A') ? 'success' :
                              student.avgGrade.startsWith('B') ? 'info' : 'warning'
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ASSIGNMENTS TAB */}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Course Assignments ({assignments.length})
                </Typography>
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/teacher/create-assignment')}
                >
                  Create Assignment
                </Button>
              </Box>

              <Stack spacing={2}>
                {assignments.map((assignment) => (
                  <Card
                    key={assignment.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      transition: 'all 0.3s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
                      },
                    }}
                  >
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {assignment.title}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip label={assignment.type} size="small" />
                            <Chip
                              label={assignment.status}
                              size="small"
                              color={assignment.status === 'active' ? 'success' : 'default'}
                            />
                          </Stack>
                        </Grid>
                        <Grid size={{ xs: 6, md: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Due Date
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Total Marks
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {assignment.totalMarks}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Stack direction="row" spacing={2}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Submissions
                              </Typography>
                              <Typography variant="body2" fontWeight={600} color="success.main">
                                {assignment.submissions}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Pending
                              </Typography>
                              <Typography variant="body2" fontWeight={600} color="warning.main">
                                {assignment.pending}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Graded
                              </Typography>
                              <Typography variant="body2" fontWeight={600} color="info.main">
                                {assignment.graded}
                              </Typography>
                            </Box>
                          </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 1 }}>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/teacher/submissions/${assignment.id}`)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                            <IconButton size="small">
                              <Edit fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {/* MATERIALS TAB */}
          {activeTab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Course Materials ({materials.length})
                </Typography>
                <Button
                  startIcon={<FileUpload />}
                  variant="contained"
                  size="small"
                  onClick={() => handleOpenDialog('material')}
                >
                  Upload Material
                </Button>
              </Box>

              <Grid container spacing={2}>
                {materials.map((material) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={material.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        borderRadius: 2,
                        transition: 'all 0.3s',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
                        },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                          <Typography variant="h2" sx={{ mb: 1 }}>
                            {getFileIcon(material.fileType)}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            {material.title}
                          </Typography>
                          <Chip label={material.type} size="small" sx={{ mb: 1 }} />
                          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {material.size}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {material.downloads} downloads
                            </Typography>
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            fullWidth
                            startIcon={<Download />}
                          >
                            Download
                          </Button>
                          <IconButton size="small" color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ANNOUNCEMENTS TAB */}
          {activeTab === 4 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Course Announcements ({announcements.length})
                </Typography>
                <Button
                  startIcon={<Campaign />}
                  variant="contained"
                  size="small"
                  onClick={() => handleOpenDialog('announcement')}
                >
                  Post Announcement
                </Button>
              </Box>

              <Stack spacing={2}>
                {announcements.map((announcement) => (
                  <Card
                    key={announcement.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderLeft: 4,
                      borderLeftColor: announcement.priority === 'high' ? 'error.main' : 'info.main',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {announcement.title}
                          </Typography>
                          <Chip
                            label={announcement.priority}
                            size="small"
                            color={announcement.priority === 'high' ? 'error' : 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Box>
                        <IconButton size="small">
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {announcement.content}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Posted on {announcement.postedAt}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* DIALOGS */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'material' && 'Upload Course Material'}
          {dialogType === 'announcement' && 'Post Announcement'}
          {dialogType === 'student' && 'Add Student'}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'material' && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField label="Material Title" fullWidth />
              <TextField label="Description" fullWidth multiline rows={3} />
              <Button variant="outlined" component="label" startIcon={<FileUpload />}>
                Choose File
                <input type="file" hidden />
              </Button>
            </Stack>
          )}
          {dialogType === 'announcement' && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField label="Announcement Title" fullWidth />
              <TextField label="Content" fullWidth multiline rows={4} />
              <TextField select label="Priority" fullWidth defaultValue="medium">
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </TextField>
            </Stack>
          )}
          {dialogType === 'student' && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField label="Student Name" fullWidth />
              <TextField label="Roll Number" fullWidth />
              <TextField label="Email" fullWidth type="email" />
              <TextField label="Phone" fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCloseDialog}>
            {dialogType === 'material' && 'Upload'}
            {dialogType === 'announcement' && 'Post'}
            {dialogType === 'student' && 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MENU */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>
          <Person fontSize="small" sx={{ mr: 1 }} />
          View Profile
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <Email fontSize="small" sx={{ mr: 1 }} />
          Send Email
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CourseManagement;
