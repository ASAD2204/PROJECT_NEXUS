import { useState, useEffect } from 'react';
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
import { sisAPI } from '../../api/sis';
import { lmsAPI } from '../../api/lms';
import { Snackbar, Alert } from '@mui/material';

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
};

const unwrapCollection = (payload, keys = []) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  return [];
};

const normalizeStudent = (student = {}) => ({
  id: student.student_id ?? student.id,
  student_id: student.student_id ?? student.id,
  user_id: student.user_id ?? null,
  name: safeText(student.name || student.full_name, 'Student'),
  email: safeText(student.email, ''),
  avatar: student.avatar || student.profile_image_id || null,
  rollNo: safeText(student.roll_no, ''),
  phone: safeText(student.phone, ''),
  attendance: toFiniteNumber(student.attendance ?? student.attendance_percentage, 0),
  assignments: toFiniteNumber(student.assignments, 0),
  avgGrade: safeText(student.avgGrade || student.avg_grade, '-'),
});

const normalizeAssignment = (assignment = {}) => ({
  id: assignment.assignment_id ?? assignment.id,
  title: safeText(assignment.title, 'Untitled Assignment'),
  type: safeText(assignment.type || assignment.assignment_type, 'assignment'),
  status: safeText(assignment.status, 'active').toLowerCase(),
  dueDate: assignment.dueDate || assignment.due_date || null,
  totalMarks: toFiniteNumber(assignment.totalMarks ?? assignment.total_marks, 0),
  submissions: toFiniteNumber(assignment.submissions, 0),
  pending: toFiniteNumber(assignment.pending, 0),
  graded: toFiniteNumber(assignment.graded, 0),
});

const normalizeMaterial = (material = {}) => ({
  id: material.material_id ?? material.id,
  title: safeText(material.title, 'Untitled Material'),
  description: safeText(material.description, ''),
  type: safeText(material.type || material.material_type, 'document'),
  fileType: safeText(material.fileType || material.file_type || material.type || material.material_type, 'DOCUMENT').toUpperCase(),
  file_ref_id: material.file_ref_id || material.fileRefId || material.file_ref || material.file_url || material.fileUrl || null,
  size: safeText(material.size, '-'),
  downloads: toFiniteNumber(material.downloads, 0),
});

const normalizeQuiz = (quiz = {}) => ({
  id: quiz.quiz_id ?? quiz.id,
  title: safeText(quiz.title, 'Untitled Quiz'),
  status: safeText(quiz.status, 'draft').toLowerCase(),
  duration: toFiniteNumber(quiz.duration_minutes ?? quiz.duration, 0),
  questions: toFiniteNumber(quiz.questions_count ?? quiz.questions?.length ?? quiz.questions, 0),
  attempts: toFiniteNumber(quiz.attempts, 0),
  startTime: quiz.start_time || quiz.startDate || null,
  endTime: quiz.end_time || null,
  totalMarks: toFiniteNumber(quiz.total_marks ?? quiz.totalMarks, 0),
});

const normalizeAnnouncement = (announcement = {}) => ({
  id: announcement.id ?? announcement.announcement_id,
  title: safeText(announcement.title, 'Announcement'),
  content: safeText(announcement.content, ''),
  priority: safeText(announcement.priority, 'medium').toLowerCase(),
  postedAt: announcement.postedAt || announcement.created_at || announcement.createdAt || null,
});

const CourseManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'assignment', 'material', 'announcement', 'student'
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetailsOpen, setStudentDetailsOpen] = useState(false);

  const [course, setCourse] = useState({ id, code: '', name: '', semester: '', students: 0, schedule: '', room: '', creditHours: 0, description: '' });
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const avgAttendance = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + Number(s.attendance || s.attendance_percentage || 0), 0) / students.length) + '%'
    : '0%';

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const [courseRes, participantRes, assignRes, matRes, quizRes, annRes] = await Promise.allSettled([
          sisAPI.getCourse(id),
          sisAPI.getSectionParticipants(id),
          lmsAPI.getCourseAssignments(id),
          lmsAPI.getCourseMaterials(id),
          lmsAPI.getQuizzes({ section_id: id }),
          lmsAPI.getCourseAnnouncements(id),
        ]);
        if (courseRes.status === 'fulfilled') {
          const c = courseRes.value.data || {};
          const sectionCourse = c.course || {};
          setCourse({
            ...c,
            id: c.section_id || c.id || id,
            code: safeText(c.code || sectionCourse.code, `SEC-${id}`),
            name: safeText(c.title || c.name || sectionCourse.title, `Section ${id}`),
            semester: safeText(c.semester || c.semester_title || (c.semester_id ? `Semester ${c.semester_id}` : ''), ''),
            students: toFiniteNumber(c.enrolled_students ?? c.students, 0),
            schedule: safeText(c.schedule, '-'),
            room: safeText(c.room_no || c.room || sectionCourse.room_no, 'TBA'),
            creditHours: toFiniteNumber(c.credit_hours || sectionCourse.credit_hours, 0),
            description: safeText(c.description || sectionCourse.description, ''),
          });
        }
        if (courseRes.status === 'fulfilled') {
          const c = courseRes.value.data || {};
          const courseId = c.course_id || c.course?.course_id || null;
          if ((!safeText(c.description || c.course?.description, '') && courseId) || !safeText(c.description, '')) {
            const courseDetailsRes = await lmsAPI.getCourse(courseId).catch(() => null);
            const courseDetails = courseDetailsRes?.data || {};
            if (courseDetails && Object.keys(courseDetails).length > 0) {
              setCourse((prev) => ({
                ...prev,
                code: safeText(prev.code || courseDetails.code, prev.code),
                name: safeText(prev.name || courseDetails.title, prev.name),
                creditHours: toFiniteNumber(prev.creditHours || courseDetails.credit_hours, prev.creditHours),
                description: safeText(prev.description || courseDetails.description, prev.description),
              }));
            }
          }
        }
        if (participantRes.status === 'fulfilled') {
          const participants = participantRes.value.data || {};
          const participantStudents = unwrapCollection(participants, ['students']).map(normalizeStudent);
          setStudents(participantStudents);
          setCourse((prev) => ({
            ...prev,
            students: participantStudents.length,
          }));
        }
        if (assignRes.status === 'fulfilled') setAssignments(unwrapCollection(assignRes.value.data, ['assignments']).map(normalizeAssignment));
        if (matRes.status === 'fulfilled') setMaterials(unwrapCollection(matRes.value.data, ['materials']).map(normalizeMaterial));
        if (quizRes.status === 'fulfilled') setQuizzes(unwrapCollection(quizRes.value.data, ['quizzes']).map(normalizeQuiz));
        if (annRes.status === 'fulfilled') setAnnouncements(unwrapCollection(annRes.value.data, ['announcements']).map(normalizeAnnouncement));
      } catch (e) { console.error('Failed to load course data', e); }
    };
    fetchCourseData();
  }, [id]);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formFields, setFormFields] = useState({ title: '', content: '', priority: 'medium', file: null });

  const handleOpenDialog = (type) => {
    setDialogType(type);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogType('');
    setFormFields({ title: '', content: '', priority: 'medium', file: null });
  };

  const handleExportStudents = () => {
    const headers = ['Name', 'Roll No', 'Email', 'Phone', 'Attendance', 'Avg Grade'];
    const rows = students.map(s => [
      s.name,
      s.rollNo,
      s.email,
      s.phone,
      `${s.attendance || s.attendance_percentage || 0}%`,
      s.avgGrade || 'N/A'
    ]);

    const csvContent = [headers.join(',')]
      .concat(rows.map(r => r.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${course.code}_students_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Student list exported successfully', severity: 'success' });
  };

  const handleActionSubmit = async () => {
    try {
      if (dialogType === 'announcement') {
        await lmsAPI.createCourseAnnouncement(id, {
          title: formFields.title,
          content: formFields.content,
          priority: formFields.priority
        });
        setSnackbar({ open: true, message: 'Announcement posted successfully!', severity: 'success' });
        // Refresh announcements
        const annRes = await lmsAPI.getCourseAnnouncements(id);
        setAnnouncements(unwrapCollection(annRes.data, ['announcements']).map(normalizeAnnouncement));
      } else if (dialogType === 'material') {
        // Mock upload logic as lmsAPI.uploadMaterial might need FormData
        const formData = new FormData();
        formData.append('title', formFields.title);
        formData.append('description', formFields.content);
        if (formFields.file) formData.append('file', formFields.file);
        
        await lmsAPI.uploadCourseMaterial(id, formData);
        setSnackbar({ open: true, message: 'Material uploaded successfully!', severity: 'success' });
        // Refresh materials
        const matRes = await lmsAPI.getCourseMaterials(id);
        setMaterials(unwrapCollection(matRes.data, ['materials']).map(normalizeMaterial));
      } else if (dialogType === 'student') {
        // Mock add student
        setSnackbar({ open: true, message: 'Student added successfully!', severity: 'success' });
      }
      handleCloseDialog();
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: `Failed to ${dialogType}`, severity: 'error' });
    }
  };

  const handleDownloadMaterial = async (material) => {
    try {
      const ref = material.file_ref_id || material.fileRefId || material.file_url || material.fileUrl;
      if (!ref) {
        setSnackbar({ open: true, message: 'No downloadable file available for this material', severity: 'error' });
        return;
      }
      const res = await lmsAPI.downloadFile(ref);
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${material.title || 'file'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Download started', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to download file', severity: 'error' });
    }
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

  const courseDescription = course.description || course.course?.description || '';

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
          subtitle={`${course.semester || 'Current Section'} • ${course.students} Students • ${course.schedule} • ${course.room}`}
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
                    {avgAttendance}
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
          <Tab label="Quizzes" />
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
                {courseDescription || 'No course description available.'}
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
                <Stack direction="row" spacing={1}>
                  <Button
                    startIcon={<Download />}
                    variant="outlined"
                    size="small"
                    onClick={handleExportStudents}
                  >
                    Export
                  </Button>
                  <Button
                    startIcon={<Add />}
                    variant="contained"
                    size="small"
                    onClick={() => handleOpenDialog('student')}
                  >
                    Add Student
                  </Button>
                </Stack>
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
                              {student.email ? (
                                <a href={`mailto:${student.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {student.email}
                                  </Typography>
                                </a>
                              ) : (
                                <Typography variant="caption" color="text.secondary">-</Typography>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                              {student.phone ? (
                                <a href={`tel:${student.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {student.phone}
                                  </Typography>
                                </a>
                              ) : (
                                <Typography variant="caption" color="text.secondary">-</Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {student.attendance || student.attendance_percentage || 0}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Number(student.attendance || student.attendance_percentage || 0)}
                              color={getAttendanceColor(Number(student.attendance || student.attendance_percentage || 0))}
                              sx={{ width: 60, mx: 'auto', height: 4, borderRadius: 2, mt: 0.5 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>
                            {student.assignments || 0}/{assignments.length}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={student.avgGrade || '-'}
                            size="small"
                            color={
                              (student.avgGrade || '').startsWith('A') ? 'success' :
                              (student.avgGrade || '').startsWith('B') ? 'info' : 'warning'
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedStudent(student); }}
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
                              {material.size || 'Unknown size'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {material.downloads || 0} downloads
                            </Typography>
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            fullWidth
                            startIcon={<Download />}
                            onClick={() => handleDownloadMaterial(material)}
                            disabled={!material.file_ref_id && !material.fileRefId && !material.file_url && !material.fileUrl}
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
                  Quizzes ({quizzes.length})
                </Typography>
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/teacher/quiz/create')}
                >
                  Create Quiz
                </Button>
              </Box>

              <Stack spacing={2}>
                {quizzes.map((quiz) => (
                  <Card
                    key={quiz.id}
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
                            {quiz.title}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip label={quiz.status} size="small" color={quiz.status === 'active' ? 'success' : quiz.status === 'completed' ? 'default' : 'warning'} />
                            <Chip label={`${quiz.questions} Questions`} size="small" />
                          </Stack>
                        </Grid>
                        <Grid size={{ xs: 6, md: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Duration
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {quiz.duration} min
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Attempts
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {quiz.attempts}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Total Marks
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {quiz.totalMarks}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 1 }}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <IconButton size="small" onClick={() => navigate(`/teacher/quiz/${quiz.id}/results`)}>
                              <Visibility fontSize="small" />
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

          {/* ANNOUNCEMENTS TAB */}
          {activeTab === 5 && (
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
                        Posted on {announcement.postedAt || new Date(announcement.created_at || Date.now()).toLocaleDateString()}
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
              <TextField 
                label="Material Title" 
                fullWidth 
                value={formFields.title}
                onChange={(e) => setFormFields({ ...formFields, title: e.target.value })}
              />
              <TextField 
                label="Description" 
                fullWidth 
                multiline 
                rows={3} 
                value={formFields.content}
                onChange={(e) => setFormFields({ ...formFields, content: e.target.value })}
              />
              <Button variant="outlined" component="label" startIcon={<FileUpload />}>
                {formFields.file ? formFields.file.name : 'Choose File'}
                <input type="file" hidden onChange={(e) => setFormFields({ ...formFields, file: e.target.files[0] })} />
              </Button>
            </Stack>
          )}
          {dialogType === 'announcement' && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField 
                label="Announcement Title" 
                fullWidth 
                value={formFields.title}
                onChange={(e) => setFormFields({ ...formFields, title: e.target.value })}
              />
              <TextField 
                label="Content" 
                fullWidth 
                multiline 
                rows={4} 
                value={formFields.content}
                onChange={(e) => setFormFields({ ...formFields, content: e.target.value })}
              />
              <TextField 
                select 
                label="Priority" 
                fullWidth 
                value={formFields.priority}
                onChange={(e) => setFormFields({ ...formFields, priority: e.target.value })}
              >
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
          <Button variant="contained" onClick={handleActionSubmit}>
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
        onClose={() => { setAnchorEl(null); setSelectedStudent(null); setStudentDetailsOpen(false); }}
      >
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setStudentDetailsOpen(true);
        }}>
          <Person fontSize="small" sx={{ mr: 1 }} />
          View Profile
        </MenuItem>
        <MenuItem onClick={() => {
          const email = selectedStudent?.email;
          setAnchorEl(null);
          if (email) {
            window.location.href = `mailto:${email}`;
          } else {
            setSnackbar({ open: true, message: 'No email address available for this student', severity: 'warning' });
          }
        }}>
          <Email fontSize="small" sx={{ mr: 1 }} />
          Send Email
        </MenuItem>
        <MenuItem onClick={() => {
          setAnchorEl(null);
          setStudentDetailsOpen(true);
        }}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
      </Menu>

      <Dialog
        open={studentDetailsOpen}
        onClose={() => setStudentDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Student Details</DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={selectedStudent.avatar} alt={selectedStudent.name} sx={{ width: 64, height: 64 }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold">{selectedStudent.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedStudent.rollNo}</Typography>
                </Box>
              </Box>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body2">{selectedStudent.email || '-'}</Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Phone</Typography>
                <Typography variant="body2">{selectedStudent.phone || '-'}</Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Attendance</Typography>
                <Typography variant="body2">{selectedStudent.attendance || selectedStudent.attendance_percentage || 0}%</Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Average Grade</Typography>
                <Typography variant="body2">{selectedStudent.avgGrade || '-'}</Typography>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Courses</Typography>
                <Typography variant="body2">{selectedStudent.courseSummary || 'N/A'}</Typography>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentDetailsOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedStudent?.email) {
                window.location.href = `mailto:${selectedStudent.email}`;
              }
            }}
            disabled={!selectedStudent?.email || selectedStudent.email === 'N/A'}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CourseManagement;
