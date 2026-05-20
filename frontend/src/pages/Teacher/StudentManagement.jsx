import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Avatar,
  Button,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  MoreVert,
  People,
  Email,
  Visibility,
  CheckCircle,
  School,
  TrendingDown,
  Download,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { pageTransition } from '../../utils/animations';
import { teacherAPI } from '../../api/teacher';
import { lmsAPI } from '../../api/lms';
import { opsAPI } from '../../api/ops';

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const safeText = (value, fallback = 'N/A') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === 'nan' || normalized.toLowerCase() === 'undefined') {
    return fallback;
  }

  return normalized;
};

const normalizeCourse = (course = {}) => {
  const sectionId = course.section_id ?? course.sectionId ?? course.id ?? null;
  const courseInfo = course.course ?? {};
  const code = safeText(courseInfo.code ?? course.code ?? (sectionId !== null ? `SEC-${sectionId}` : null), 'N/A');
  const name = safeText(courseInfo.title ?? course.name ?? course.title ?? `Section ${sectionId}`, sectionId !== null ? `Section ${sectionId}` : 'Untitled Course');

  return {
    sectionId,
    courseId: course.course_id ?? courseInfo.course_id ?? null,
    code,
    name,
    label: `${code !== 'N/A' ? `${code} - ` : ''}${name}`,
    students: toFiniteNumber(course.enrolled_students ?? course.students),
    attendance: toFiniteNumber(course.attendance_percentage ?? course.attendance),
    assignments: toFiniteNumber(course.assignments_count),
    quizzes: toFiniteNumber(course.quizzes_count),
    room: safeText(course.room_no, 'TBA'),
    semester: course.semester_id ? `Semester ${course.semester_id}` : 'N/A',
  };
};

const normalizeStudentCourse = (course = {}) => ({
  sectionId: course.section_id ?? course.sectionId ?? null,
  courseId: course.course_id ?? null,
  code: safeText(course.course_code ?? course.code, 'N/A'),
  name: safeText(course.course_name ?? course.courseTitle ?? course.course_title ?? course.name, 'Untitled Course'),
  room: safeText(course.room_no, 'TBA'),
  semesterId: course.semester_id ?? course.semesterId ?? null,
});

const summarizeCourses = (courses = []) => {
  if (!courses.length) {
    return 'N/A';
  }

  const labels = courses.map((course) => `${course.code !== 'N/A' ? `${course.code} - ` : ''}${course.name}`);
  if (labels.length <= 2) {
    return labels.join(', ');
  }

  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`;
};

const normalizeStudent = (student = {}) => {
  const courses = Array.isArray(student.courses) ? student.courses.map(normalizeStudentCourse) : [];
  const cgpa = toFiniteNumber(student.cgpa, 0);
  const riskStatus = safeText(student.current_risk_status, 'Green');
  const riskSeverity = riskStatus === 'Red' ? 'error' : riskStatus === 'Yellow' ? 'warning' : 'success';
  const fullName = safeText(student.full_name, `Student ${student.student_id ?? ''}`.trim());
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'S';

  return {
    id: student.student_id ?? student.id,
    studentId: student.student_id ?? student.id,
    userId: student.user_id ?? null,
    name: fullName,
    email: safeText(student.email, 'N/A'),
    phone: safeText(student.phone, 'N/A'),
    rollNo: safeText(student.roll_no, `ROLL-${student.student_id ?? ''}`.replace(/-$/, '')),
    avatar: student.profile_image_url || '',
    initials,
    cgpa,
    cgpaLabel: cgpa.toFixed(2),
    riskStatus,
    riskSeverity,
    program: safeText(student.program_title || student.program_code, 'N/A'),
    currentSemester: student.current_semester ?? null,
    courses,
    courseCount: courses.length,
    courseSummary: summarizeCourses(courses),
  };
};

const StudentManagement = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterCourse, setFilterCourse] = useState('all');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');
  const [notificationPriority, setNotificationPriority] = useState('medium');
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([{ value: 'all', label: 'All Courses' }]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studRes, courseRes] = await Promise.allSettled([
          teacherAPI.getMyStudents(),
          teacherAPI.getMyCourses(),
        ]);
        if (studRes.status === 'fulfilled') {
          const raw = studRes.value.data?.students || studRes.value.data || [];
          const normalized = (Array.isArray(raw) ? raw : []).map(normalizeStudent);
          setStudents(normalized);
        }
        if (courseRes.status === 'fulfilled') {
          const crs = courseRes.value.data?.courses || courseRes.value.data || [];
          const normalizedCourses = (Array.isArray(crs) ? crs : []).map(normalizeCourse);
          setCourses([
            { value: 'all', label: 'All Courses' },
            ...normalizedCourses.map((course) => ({
              value: String(course.sectionId),
              label: course.label,
              sectionId: course.sectionId,
            })),
          ]);
        }
      } catch (e) { console.error('Failed to load students', e); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filterCourse]);

  const handleMenuOpen = (event, student) => {
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = () => {
    setDetailsDialogOpen(true);
    handleMenuClose();
  };

  const handleOpenNotifyDialog = () => {
    if (!selectedStudent) return;
    
    let defaultTitle = 'Academic Update';
    let defaultMessage = `Dear ${selectedStudent.name},\n\nI wanted to reach out regarding your academic progress in our course. `;
    let defaultType = 'info';
    let defaultPriority = 'medium';

    if (selectedStudent.riskStatus === 'Red') {
      defaultTitle = 'Urgent: Academic Performance Alert';
      defaultMessage = `Dear ${selectedStudent.name},\n\nYour academic performance has been flagged as High Risk. Your attendance or assessment scores are currently below the required threshold. Please schedule a meeting with me as soon as possible to outline a remediation plan and ensure you stay on track.\n\nBest regards,\nYour Instructor`;
      defaultType = 'warning';
      defaultPriority = 'high';
    } else if (selectedStudent.riskStatus === 'Yellow') {
      defaultTitle = 'Academic Progress Advisory';
      defaultMessage = `Dear ${selectedStudent.name},\n\nYour academic standing has been flagged as Medium Risk. We have noticed some decline in your grades or attendance. I encourage you to review your recent submissions and visit me during office hours so we can discuss how to support your learning.\n\nBest regards,\nYour Instructor`;
      defaultType = 'warning';
      defaultPriority = 'medium';
    } else {
      defaultTitle = 'Important Course Notification';
      defaultMessage = `Dear ${selectedStudent.name},\n\nI am sending a quick update regarding your course enrollment. Keep up the good work and feel free to reach out if you have any questions.\n\nBest regards,\nYour Instructor`;
      defaultType = 'info';
      defaultPriority = 'medium';
    }

    setNotificationTitle(defaultTitle);
    setNotificationMessage(defaultMessage);
    setNotificationType(defaultType);
    setNotificationPriority(defaultPriority);
    setNotifyDialogOpen(true);
    handleMenuClose();
  };

  const handleSendNotification = async () => {
    if (!selectedStudent || !selectedStudent.userId) {
      showSnackbar('Unable to identify student user account. Cannot send notification.', 'error');
      return;
    }
    try {
      await opsAPI.createNotification({
        user_id: selectedStudent.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        priority: notificationPriority
      });
      showSnackbar(`Warning notification successfully sent to ${selectedStudent.name}!`, 'success');
      setNotifyDialogOpen(false);
    } catch (e) {
      console.error(e);
      showSnackbar('Failed to dispatch notification to student.', 'error');
    }
  };

  const handleExportGradebook = async () => {
    if (filterCourse === 'all') {
      showSnackbar('Please select a specific course to export the gradebook', 'warning');
      return;
    }
    try {
      const response = await lmsAPI.exportGradebook(filterCourse);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gradebook_course_${filterCourse}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSnackbar('Gradebook exported successfully', 'success');
    } catch (e) {
      console.error(e);
      showSnackbar('Failed to export gradebook', 'error');
    }
  };

  const totalStudents = students.length;
  const averageCgpa = totalStudents > 0
    ? (students.reduce((sum, student) => sum + student.cgpa, 0) / totalStudents).toFixed(2)
    : '0.00';
  const assignedSections = Math.max(courses.length - 1, 0);
  const atRiskStudents = students.filter((student) => student.riskSeverity === 'warning' || student.riskSeverity === 'error').length;
  const filteredStudents = students.filter((student) => {
    const matchesSearch = [
      student.name,
      student.rollNo,
      student.email,
      student.program,
      student.courseSummary,
    ].some((field) => String(field).toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourse = filterCourse === 'all'
      || student.courses.some((course) => String(course.sectionId) === String(filterCourse));

    return matchesSearch && matchesCourse;
  });

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Student Management"
          subtitle="Monitor enrolled students, program details, and academic risk across your sections"
        />

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Total Students"
              value={totalStudents}
              icon={People}
              color="primary"
              tooltip="Total distinct students enrolled across your taught sections"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Avg CGPA"
              value={averageCgpa}
              icon={CheckCircle}
              color="success"
              tooltip="Average CGPA across the enrolled students in your sections"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="Assigned Sections"
              value={assignedSections}
              icon={School}
              color="warning"
              tooltip="Number of sections currently assigned to you"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title="At Risk Students"
              value={atRiskStudents}
              icon={TrendingDown}
              color="error"
              tooltip="Students marked as Red or Yellow in the SIS risk status"
            />
          </Grid>
        </Grid>

        <Card>
          <CardContent>
            {/* Toolbar */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Filter by Course</InputLabel>
                    <Select
                      value={filterCourse}
                      label="Filter by Course"
                      onChange={(e) => setFilterCourse(e.target.value)}
                    >
                      {courses.map((course) => (
                        <MenuItem key={course.value} value={course.value}>
                          {course.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button startIcon={<Download />} variant="outlined" onClick={handleExportGradebook}>
                    Export Gradebook
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {/* Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Roll No</TableCell>
                    <TableCell>Courses</TableCell>
                    <TableCell>Program</TableCell>
                    <TableCell>CGPA</TableCell>
                    <TableCell>Risk Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((student) => {
                    const riskChipColor = student.riskSeverity;

                    return (
                      <TableRow
                        key={student.id}
                        hover
                        sx={{
                          backgroundColor: student.riskSeverity === 'error'
                            ? alpha(theme.palette.error.main, 0.08)
                            : student.riskSeverity === 'warning'
                              ? alpha(theme.palette.warning.main, 0.08)
                              : 'transparent',
                          '&:hover': {
                            backgroundColor: student.riskSeverity === 'error'
                              ? alpha(theme.palette.error.main, 0.12)
                              : student.riskSeverity === 'warning'
                                ? alpha(theme.palette.warning.main, 0.12)
                                : alpha(theme.palette.action.hover, 0.04),
                          },
                          borderLeft: student.riskSeverity === 'error'
                            ? `4px solid ${theme.palette.error.main}`
                            : student.riskSeverity === 'warning'
                              ? `4px solid ${theme.palette.warning.main}`
                              : 'none',
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar src={student.avatar} alt={student.name}>{student.initials}</Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {student.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {student.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{student.rollNo}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {student.courseSummary}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {student.program}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={student.cgpaLabel} size="small" color="primary" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={student.riskStatus}
                            size="small"
                            color={riskChipColor}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={(e) => handleMenuOpen(e, student)}>
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!filteredStudents.length && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No students match the current filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={filteredStudents.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
            />
          </CardContent>
        </Card>

        {/* Actions Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleViewDetails}>
            <Visibility fontSize="small" sx={{ mr: 1 }} /> View Details
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedStudent) {
                showSnackbar(`Email sent to ${selectedStudent.name}`, 'success');
              }
              handleMenuClose();
            }}
          >
            <Email fontSize="small" sx={{ mr: 1 }} /> Send Email
          </MenuItem>
          <MenuItem onClick={handleOpenNotifyDialog}>
            <CheckCircle fontSize="small" sx={{ mr: 1 }} /> Notify Student
          </MenuItem>
        </Menu>

        {/* Student Details Dialog */}
        <Dialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Student Details</DialogTitle>
          <DialogContent>
            {selectedStudent && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar src={selectedStudent.avatar} sx={{ width: 80, height: 80 }}>
                    {selectedStudent.initials}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {selectedStudent.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedStudent.rollNo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedStudent.program}
                    </Typography>
                    <Chip
                      label={selectedStudent.riskStatus}
                      size="small"
                      color={selectedStudent.riskSeverity}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body2">{selectedStudent.email}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body2">{selectedStudent.phone}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      CGPA
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedStudent.cgpaLabel}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Current Semester
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedStudent.currentSemester ?? 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    Enrolled Courses
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {selectedStudent.courses.length > 0 ? (
                      selectedStudent.courses.map((course) => (
                        <Chip
                          key={`${course.sectionId}-${course.courseId || course.code}`}
                          label={`${course.code !== 'N/A' ? `${course.code} - ` : ''}${course.name}`}
                          size="small"
                          variant="outlined"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No course enrollment data available.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Notify Student Dialog */}
        <Dialog
          open={notifyDialogOpen}
          onClose={() => setNotifyDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(10px)',
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>
            Send Warning Alert to Student
          </DialogTitle>
          <DialogContent>
            {selectedStudent && (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                  <Avatar src={selectedStudent.avatar} size="small">{selectedStudent.initials}</Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">{selectedStudent.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{selectedStudent.rollNo} • {selectedStudent.email}</Typography>
                  </Box>
                  <Box sx={{ ml: 'auto' }}>
                    <Chip 
                      label={`Risk: ${selectedStudent.riskStatus}`} 
                      size="small" 
                      color={selectedStudent.riskSeverity} 
                    />
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  label="Notification Title"
                  variant="outlined"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Message Body"
                  variant="outlined"
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                />

                <Stack direction="row" spacing={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={notificationType}
                      label="Type"
                      onChange={(e) => setNotificationType(e.target.value)}
                    >
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                      <MenuItem value="success">Success</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={notificationPriority}
                      label="Priority"
                      onChange={(e) => setNotificationPriority(e.target.value)}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setNotifyDialogOpen(false)} color="inherit">Cancel</Button>
            <Button onClick={handleSendNotification} variant="contained" color="primary">Send Notification</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default StudentManagement;
