import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper,
  Avatar,
  Tooltip,
  alpha,
  Menu,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Search,
  Edit,
  Delete,
  Visibility,
  People,
  Schedule,
  MenuBook,
  School,
  MoreVert,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { pageTransition } from '../../utils/animations';
import { authAPI } from '../../api/auth';
import { sisAPI } from '../../api/sis';

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

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const CourseManagement = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [formData, setFormData] = useState({
    courseCode: '',
    courseTitle: '',
    creditHours: 3,
    department: '',
    instructor: '',
    semester: '',
    capacity: 50,
    roomNumber: '',
    sectionId: '',
    description: '',
    program: '',
  });

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [cardMenuAnchor, setCardMenuAnchor] = useState(null);
  const [activeCardCourse, setActiveCardCourse] = useState(null);

  const normalizeCourse = useCallback((course, facultyMap = new Map(), deptMap = new Map(), semesterMap = new Map()) => {
    const sections = course.sections || [];
    
    // Get primary section (first one)
    const primarySection = sections.length > 0 ? sections[0] : null;
    
    // Resolve instructor from primary section
    const instructorId = primarySection?.faculty_id || course.instructor_id || course.faculty_id || null;
    const instructorRecord = facultyMap.get(String(instructorId));

    const deptId = course.dept_id ?? course.deptId;
    const deptRecord = deptMap.get(String(deptId));

    // Resolve semester from primary section
    const semesterId = primarySection?.semester_id || course.semester_id;
    const semesterRecord = semesterMap.get(String(semesterId));

    return {
      id: course.id || course.course_id,
      code: course.code || '',
      name: course.name || course.title || '',
      title: course.title || course.name || '',
      creditHours: course.creditHours || course.credit_hours || 0,
      department: deptRecord?.name || course.department || `Dept ${deptId ?? '-'}`,
      deptId: deptId,
      capacity: course.capacity || 0,
      enrolled: course.enrolled || 0,
      schedule: course.schedule || '-',
      status: (course.status || 'active').toLowerCase(),
      description: course.description || '',
      instructor: instructorRecord || null,
      instructorId: instructorId || null,
      instructorName: instructorRecord?.name || '',
      semester: semesterId ? String(semesterId) : '',
      semesterLabel: semesterRecord?.title || semesterRecord?.name || (semesterId ? `Semester ${semesterId}` : ''),
      semesterId: semesterId,
      roomNo: primarySection?.room_no || course.room_no || course.roomNo || '',
      sections: sections,
      programId: course.program_id,
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [coursesRes, deptsRes, facultyRes, programsRes, usersRes, semestersRes] = await Promise.allSettled([
        sisAPI.getCoursesAdmin(),
        sisAPI.getDepartments(),
        sisAPI.getFaculty(),
        sisAPI.getPrograms(),
        authAPI.listUsers(),
        sisAPI.getSemesters(),
      ]);
      const courseRows = coursesRes.status === 'fulfilled'
        ? unwrapCollection(coursesRes.value.data, ['courses'])
        : [];
      const deptRows = deptsRes.status === 'fulfilled'
        ? unwrapCollection(deptsRes.value.data, ['departments'])
        : [];
      const facultyRows = facultyRes.status === 'fulfilled'
        ? unwrapCollection(facultyRes.value.data, ['faculty'])
        : [];
      const programRows = programsRes.status === 'fulfilled'
        ? unwrapCollection(programsRes.value.data, ['programs'])
        : [];
      const userRows = usersRes.status === 'fulfilled'
        ? unwrapCollection(usersRes.value.data, ['users'])
        : [];
      const semesterRows = semestersRes.status === 'fulfilled'
        ? unwrapCollection(semestersRes.value.data, ['semesters'])
        : [];

      const authUserMap = new Map((Array.isArray(userRows) ? userRows : []).map((user) => [String(user.user_id || user.id), user]));
      const mappedFaculty = (Array.isArray(facultyRows) ? facultyRows : []).map((member) => {
        const facultyId = member.faculty_id || member.id;
        const authUser = authUserMap.get(String(member.user_id));
        const department = (Array.isArray(deptRows) ? deptRows : []).find((dept) => String(dept.dept_id || dept.id) === String(member.dept_id));
        const fullName = [authUser?.first_name, authUser?.last_name].filter(Boolean).join(' ').trim();

        return {
          ...member,
          id: facultyId,
          faculty_id: facultyId,
          name: fullName || authUser?.email || `Faculty ${facultyId}`,
          email: authUser?.email || member.email || '',
          department: department?.name || member.department || `Dept ${member.dept_id ?? '-'}`,
        };
      });
      const facultyMap = new Map(mappedFaculty.map((member) => [String(member.faculty_id || member.id), member]));
      const deptMap = new Map(deptRows.map((dept) => [String(dept.dept_id || dept.id), dept]));
      const semesterMap = new Map(semesterRows.map((sem) => [String(sem.semester_id || sem.id), sem]));

      setCourses((Array.isArray(courseRows) ? courseRows : []).map((course) => normalizeCourse(course, facultyMap, deptMap, semesterMap)));
      setDepartments(Array.isArray(deptRows) ? deptRows : []);
      setFaculty(mappedFaculty);
      setProgramsList(Array.isArray(programRows) ? programRows : []);
      setSemesters(Array.isArray(semesterRows) ? semesterRows : []);

      const failedKeys = [];
      if (coursesRes.status === 'rejected') failedKeys.push('courses');
      if (deptsRes.status === 'rejected') failedKeys.push('departments');
      if (facultyRes.status === 'rejected') failedKeys.push('faculty');
      if (programsRes.status === 'rejected') failedKeys.push('programs');
      if (usersRes.status === 'rejected') failedKeys.push('users');
      if (semestersRes.status === 'rejected') failedKeys.push('semesters');
      const failureCount = failedKeys.length;
      if (failureCount > 0) {
        showSnackbar(
          failureCount >= 5
            ? 'Failed to load course data'
            : `Loaded course data with partial failures (${failedKeys.join(', ')})`,
          failureCount >= 5 ? 'error' : 'warning'
        );
      }
    } catch (e) {
      console.error(e);
      showSnackbar('Failed to load course data', 'error');
    }
  }, [normalizeCourse, showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const MAX_COURSE_CODE_LENGTH = 10;

  const resetForm = () => {
    setFormData({
      courseCode: '',
      courseTitle: '',
      creditHours: 3,
      department: '',
      instructor: '',
      semester: '',
      capacity: 50,
      roomNumber: '',
      sectionId: '',
      description: '',
      program: '',
    });
    setEditingCourseId(null);
  };

  const handleSaveCourse = async () => {
    if (!formData.courseCode || !formData.courseTitle || !formData.creditHours) {
      showSnackbar('Course code, title, and credit hours are required.', 'error');
      return;
    }

    if (!formData.department) {
      showSnackbar('Select a department before saving the course.', 'error');
      return;
    }

    const departmentId = Number(formData.department);
    if (!Number.isFinite(departmentId)) {
      showSnackbar('Select a valid department before saving the course.', 'error');
      return;
    }

    const coursePayload = {
      code: formData.courseCode.trim().toUpperCase().slice(0, MAX_COURSE_CODE_LENGTH),
      title: formData.courseTitle,
      credit_hours: Number(formData.creditHours),
      dept_id: departmentId,
      description: formData.description || null,
      program_id: Number(formData.program) || null,
    };

    try {
      let courseId = editingCourseId;
      if (editingCourseId) {
        await sisAPI.updateCourse(editingCourseId, coursePayload);
      } else {
        const res = await sisAPI.createCourse(coursePayload);
        courseId = res.data?.course_id || res.data?.id;
      }

      // If instructor or capacity is provided, create or update section
      if (courseId && (formData.instructor || formData.semester)) {
        const sectionPayload = {
          course_id: courseId,
          faculty_id: Number(formData.instructor) || null,
          semester_id: Number(formData.semester) || 1,
          capacity: Number(formData.capacity) || 50,
          room_no: formData.roomNumber || null,
        };

        // If editing and sectionId present, update that section instead of creating a new one
        if (editingCourseId && formData.sectionId) {
          await sisAPI.updateSection(Number(formData.sectionId), sectionPayload);
        } else {
          await sisAPI.createSection(sectionPayload);
        }
      }

      setOpenDialog(false);
      resetForm();
      await loadData();
      showSnackbar(editingCourseId ? 'Course updated successfully.' : 'Course created successfully.', 'success');
    } catch (e) {
      console.error(e);
      showSnackbar(e?.response?.data?.detail || 'Unable to save course.', 'error');
    }
  };

  const handleExportCourses = () => {
    const headers = ['Code', 'Name', 'Department', 'Credit Hours', 'Capacity', 'Enrolled', 'Status', 'Description'];
    const rows = courses.map((c) => [
      c.code,
      c.name,
      c.department,
      c.creditHours,
      c.capacity,
      c.enrolled,
      c.status,
      c.description,
    ]);

    const csvContent = [headers.join(',')]
      .concat(rows.map((r) => r.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `courses-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      await sisAPI.deleteCourse(courseId);
      await loadData();
      showSnackbar('Course deleted successfully.', 'success');
    } catch (e) {
      console.error(e);
      showSnackbar(e?.response?.data?.detail || 'Unable to delete course.', 'error');
    }
  };

  const handleViewCourse = (course) => {
    setSelectedCourse(course);
    setOpenViewDialog(true);
  };

  const handleOpenEditDialog = (course) => {
    setFormData({
      courseCode: course.code,
      courseTitle: course.name,
      creditHours: course.creditHours,
      department: String(course.deptId || ''),
      instructor: String(course.instructorId || course.instructor?.faculty_id || course.instructor?.id || course.instructor || ''),
      semester: String(course.semesterId || course.semester || ''),
      capacity: course.capacity,
      roomNumber: course.roomNo || '',
      sectionId: course.sections && course.sections.length > 0 ? String(course.sections[0].section_id || course.sections[0].id || '') : '',
      description: course.description || '',
      program: String(course.programId || ''),
    });
    setEditingCourseId(course.id);
    setOpenDialog(true);
  };

  const handleCourseMenuOpen = (event, course) => {
    setCardMenuAnchor(event.currentTarget);
    setActiveCardCourse(course);
  };

  const handleCourseMenuClose = () => {
    setCardMenuAnchor(null);
    setActiveCardCourse(null);
  };

  const getEnrollmentPercentage = (enrolled, capacity) => {
    const safeCapacity = Number(capacity);
    if (!safeCapacity || safeCapacity <= 0) return 0;
    const pct = Math.round((Number(enrolled || 0) / safeCapacity) * 100);
    return Math.max(0, Math.min(100, pct));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'default';
      case 'archived':
        return 'error';
      default:
        return 'default';
    }
  };

  const departmentStats = departments.map((dept, index) => {
    const deptId = dept.dept_id ?? dept.id;
    const deptCourses = courses.filter((course) => String(course.deptId) === String(deptId));
    const activeStudents = deptCourses.reduce((sum, course) => sum + Number(course.enrolled || 0), 0);

    return {
      key: deptId || index,
      name: dept.name || `Department ${deptId || index + 1}`,
      courses: deptCourses.length,
      activeStudents,
      color: index === 0 ? 'primary' : index === 1 ? 'success' : index === 2 ? 'info' : 'warning',
      tooltip: `${dept.name || `Department ${deptId || index + 1}`} department with ${deptCourses.length} active courses and ${activeStudents} enrolled students`,
    };
  });

  const semesterOptions = semesters.length > 0
    ? semesters.map((semester) => ({
        value: String(semester.semester_id || semester.id),
        label: semester.title || semester.name || `Semester ${semester.semester_id || semester.id}`,
      }))
    : [
        { value: '1', label: '1st Semester' },
        { value: '2', label: '2nd Semester' },
        { value: '3', label: '3rd Semester' },
        { value: '4', label: '4th Semester' },
        { value: '5', label: '5th Semester' },
        { value: '6', label: '6th Semester' },
        { value: '7', label: '7th Semester' },
        { value: '8', label: '8th Semester' },
        { value: '9', label: '9th Semester' },
        { value: '10', label: '10th Semester' },
        { value: '11', label: '11th Semester' },
        { value: '12', label: '12th Semester' },
      ];

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Course Management"
          subtitle="Manage courses, schedules, and enrollments"
        />

        {/* Department Overview */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {departmentStats.map((dept, index) => (
            <Grid key={dept.key} size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title={dept.name}
                value={`${dept.courses} Courses`}
                subtitle={`${dept.activeStudents} Students`}
                icon={School}
                color={dept.color}
                tooltip={dept.tooltip}
              />
            </Grid>
          ))}
        </Grid>

        <Card>
          <CardContent>
            {/* Toolbar */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search courses..."
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
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Department</InputLabel>
                    <Select label="Department" defaultValue="all">
                      <MenuItem value="all">All Departments</MenuItem>
                      {departments.map((dept) => (
                        <MenuItem key={dept.dept_id || dept.id} value={String(dept.dept_id || dept.id)}>
                          {dept.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={handleExportCourses}
                    sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
                  >
                    Export
                  </Button>
                  <Button 
                    startIcon={<Add />} 
                    variant="contained" 
                    size="small"
                    onClick={() => {
                      resetForm();
                      setOpenDialog(true);
                    }}
                    sx={{ minWidth: { xs: '100%', sm: 'auto' }, mt: { xs: 1, sm: 0 } }}
                  >
                    Add Course
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {/* Courses Grid */}
            <Grid container spacing={3}>
              {courses.map((course) => (
                <Grid key={course.id} size={{ xs: 12, md: 6, lg: 4 }}>
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
                      <Box>
                        <Chip label={course.code} size="small" color="primary" sx={{ mb: 1 }} />
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {course.name}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={(event) => handleCourseMenuOpen(event, course)}>
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Stack spacing={1.5} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <School fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {course.department}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {course.schedule}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MenuBook fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {course.creditHours} Credit Hours
                        </Typography>
                      </Box>
                    </Stack>

                    {course.instructor && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar src={course.instructor.avatar} sx={{ width: 32, height: 32 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Instructor
                          </Typography>
                          <Typography variant="body2" fontWeight="500">
                            {course.instructorName || course.instructor.name}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        mb: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Enrollment
                        </Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {course.enrolled}/{course.capacity}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.primary.main, 0.15),
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${getEnrollmentPercentage(course.enrolled, course.capacity)}%`,
                            backgroundColor: theme.palette.primary.main,
                            transition: 'width 0.3s',
                          }}
                        />
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                      <Chip label={course.status} size="small" color={getStatusColor(course.status)} />
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleViewCourse(course)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleOpenEditDialog(course)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        <Menu
          anchorEl={cardMenuAnchor}
          open={Boolean(cardMenuAnchor && activeCardCourse)}
          onClose={handleCourseMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              if (activeCardCourse) handleViewCourse(activeCardCourse);
              handleCourseMenuClose();
            }}
          >
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            View
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (activeCardCourse) handleOpenEditDialog(activeCardCourse);
              handleCourseMenuClose();
            }}
          >
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        </Menu>

        {/* Course Details Dialog */}
        <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Course Details</DialogTitle>
          <DialogContent>
            {selectedCourse && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Course Code</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedCourse.code}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Credit Hours</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedCourse.creditHours}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Department</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedCourse.department}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Program</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {programsList.find((program) => String(program.program_id) === String(selectedCourse.programId))?.title || 'General'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Instructor</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedCourse.instructorName || selectedCourse.instructor?.name || 'Not assigned'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Semester</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedCourse.semesterLabel || selectedCourse.semester || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Capacity</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedCourse.capacity}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Enrollment</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedCourse.enrolled}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Room Number</Typography>
                  <Typography variant="body1" fontWeight="bold">{selectedCourse.roomNo || '-'}</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{selectedCourse.description || 'No course description available.'}</Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Add Course Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>{editingCourseId ? 'Edit Course' : 'Add New Course'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  fullWidth 
                  label="Course Code *" 
                  placeholder="e.g., CS-501"
                  value={formData.courseCode}
                  onChange={handleChange('courseCode')}
                  required 
                  inputProps={{ maxLength: MAX_COURSE_CODE_LENGTH }}
                  helperText={`Max ${MAX_COURSE_CODE_LENGTH} characters`}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  fullWidth 
                  label="Course Title *" 
                  placeholder="e.g., Advanced Web Technologies"
                  value={formData.courseTitle}
                  onChange={handleChange('courseTitle')}
                  required 
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth required>
                  <InputLabel>Department *</InputLabel>
                  <Select 
                    value={formData.department}
                    onChange={handleChange('department')}
                    label="Department *"
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.dept_id} value={String(dept.dept_id)}>{dept.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Program</InputLabel>
                  <Select 
                    value={formData.program}
                    onChange={handleChange('program')}
                    label="Program"
                  >
                    <MenuItem value="">General (No Program)</MenuItem>
                    {programsList.filter(p => !formData.department || String(p.dept_id) === String(formData.department)).map((p) => (
                      <MenuItem key={p.program_id} value={String(p.program_id)}>{p.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth required>
                  <InputLabel>Credit Hours *</InputLabel>
                  <Select 
                    value={formData.creditHours}
                    onChange={handleChange('creditHours')}
                    label="Credit Hours *"
                  >
                    <MenuItem value={1}>1</MenuItem>
                    <MenuItem value={2}>2</MenuItem>
                    <MenuItem value={3}>3</MenuItem>
                    <MenuItem value={4}>4</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Instructor *</InputLabel>
                  <Select 
                    value={formData.instructor}
                    onChange={handleChange('instructor')}
                    label="Instructor *"
                  >
                    {faculty.map((f) => (
                      <MenuItem key={f.faculty_id || f.id} value={String(f.faculty_id || f.id)}>
                        {f.name || `Faculty ${f.faculty_id || f.id}`} - {f.department || departments.find(d => String(d.dept_id) === String(f.dept_id))?.name || 'Unknown'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth required>
                  <InputLabel>Semester *</InputLabel>
                  <Select 
                    value={formData.semester}
                    onChange={handleChange('semester')}
                    label="Semester *"
                  >
                    {semesterOptions.map((semester) => (
                      <MenuItem key={semester.value} value={semester.value}>
                        {semester.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField 
                  fullWidth 
                  label="Capacity *" 
                  type="number" 
                  placeholder="e.g., 50"
                  value={formData.capacity}
                  onChange={handleChange('capacity')}
                  inputProps={{ min: 10, max: 200 }}
                  required 
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField 
                  fullWidth 
                  label="Room Number" 
                  placeholder="e.g., Room-301"
                  value={formData.roomNumber}
                  onChange={handleChange('roomNumber')}
                />
              </Grid>
              <Grid size={12}>
                <TextField 
                  fullWidth 
                  label="Course Description" 
                  multiline 
                  rows={3} 
                  placeholder="Brief description of the course content and objectives"
                  value={formData.description}
                  onChange={handleChange('description')}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveCourse}>
              {editingCourseId ? 'Update Course' : 'Create Course'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default CourseManagement;
