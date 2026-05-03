import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Checkbox,
  useTheme,
  alpha,
  LinearProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  HowToReg,
  Save,
  Download,
  FilterList,
  CheckCircle,
  Cancel,
  Schedule,
  TrendingUp,
  TrendingDown,
  People,
} from '@mui/icons-material';
import PageHeader from '../../components/Common/PageHeader';
import StatCard from '../../components/Common/StatCard';
import { fadeInUp, staggerContainer } from '../../utils/animations';
import { attendanceAPI } from '../../api/attendance';
import { teacherAPI } from '../../api/teacher';
import { lmsAPI } from '../../api/lms';

const TeacherAttendance = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState([
    { title: 'Total Students', value: '—', icon: People, color: 'primary.main', tooltip: '' },
    { title: 'Present Today', value: '—', icon: CheckCircle, color: 'success.main', tooltip: '' },
    { title: 'Absent Today', value: '—', icon: Cancel, color: 'error.main', tooltip: '' },
    { title: 'Attendance Rate', value: '—', icon: TrendingUp, color: 'info.main', tooltip: '' },
  ]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await teacherAPI.getMyCourses();
        const crs = res.data?.courses || res.data || [];
        const normalized = crs.map(c => ({ 
          code: c.section_id || c.id, 
          name: c.course?.title || c.name || 'Course', 
          courseCode: c.course?.code || c.code || 'N/A'
        }));
        setCourses(normalized);
        if (normalized.length) setSelectedCourse(normalized[0].code);
      } catch (e) { console.error(e); }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    const fetchAttendance = async () => {
      try {
        const res = await attendanceAPI.getAll({ course: selectedCourse, date: selectedDate });
        const data = res.data;
        if (data?.students) {
          setStudents(data.students);
          // Initialize attendance state from backend status
          const initialAttendance = {};
          data.students.forEach(s => {
            if (s.todayStatus && s.todayStatus !== 'not_marked') {
              initialAttendance[s.id] = s.todayStatus;
            }
          });
          setAttendance(initialAttendance);
        }
        if (data?.stats) {
          setStats(data.stats.map(s => ({ 
            ...s, 
            icon: { 
              'Total Students': People, 
              'Present Today': CheckCircle, 
              'Absent Today': Cancel, 
              'Attendance Rate': TrendingUp 
            }[s.title] || People 
          })));
        }
      } catch (e) { console.error(e); }
    };
    fetchAttendance();
  }, [selectedCourse, selectedDate]);

  const handleAttendanceChange = (studentId, value) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSaveAttendance = async () => {
    try {
      await attendanceAPI.markAttendance({ 
        course: selectedCourse, 
        date: selectedDate, 
        records: attendance 
      });
      setSnackbar({ open: true, message: 'Attendance saved successfully', severity: 'success' });
      // Refresh data
      const res = await attendanceAPI.getAll({ course: selectedCourse, date: selectedDate });
      if (res.data?.stats) {
        setStats(res.data.stats.map(s => ({ 
          ...s, 
          icon: { 
            'Total Students': People, 
            'Present Today': CheckCircle, 
            'Absent Today': Cancel, 
            'Attendance Rate': TrendingUp 
          }[s.title] || People 
        })));
      }
    } catch (e) { 
      console.error('Failed to save attendance', e);
      setSnackbar({ open: true, message: 'Failed to save attendance', severity: 'error' });
    }
  };

  const handleSelectAll = (value) => {
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student.id] = value;
    });
    setAttendance(newAttendance);
  };

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleExportAttendance = async () => {
    if (!selectedCourse) return;
    try {
      const response = await lmsAPI.exportAttendance(selectedCourse);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_section_${selectedCourse}_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSnackbar({ open: true, message: 'Attendance report exported successfully', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to export attendance', severity: 'error' });
    }
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 90) return 'success';
    if (rate >= 75) return 'warning';
    return 'error';
  };

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;
  const leaveCount = Object.values(attendance).filter(v => v === 'leave').length;

  return (
    <Box className="page-container">
      {/* HEADER */}
      <PageHeader
        icon={HowToReg}
        title="Attendance Management"
        subtitle="Mark and manage student attendance for your courses"
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      />

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
        {stats.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index} component={motion.div} variants={fadeInUp}>
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

      {/* FILTERS */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Select Course"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                {courses.map((course) => (
                  <MenuItem key={course.code} value={course.code}>
                    {course.code} - {course.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={1} 
                justifyContent="flex-end"
              >
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CheckCircle />}
                  onClick={() => handleSelectAll('present')}
                  sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 140 } }}
                >
                  Mark All Present
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Download />}
                  onClick={handleExportAttendance}
                  sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 120 } }}
                >
                  Export Report
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Schedule />}
                  onClick={() => navigate('/attendance/history')}
                  sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 120 } }}
                >
                  View History
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ATTENDANCE MARKING */}
      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight="bold">
              Mark Attendance - {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
            {Object.keys(attendance).length > 0 && (
              <Stack direction="row" spacing={2}>
                <Chip
                  icon={<CheckCircle />}
                  label={`Present: ${presentCount}`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<Cancel />}
                  label={`Absent: ${absentCount}`}
                  color="error"
                  variant="outlined"
                />
                {leaveCount > 0 && (
                  <Chip
                    icon={<Schedule />}
                    label={`Leave: ${leaveCount}`}
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Stack>
            )}
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Roll Number</TableCell>
                  <TableCell align="center">Overall Attendance</TableCell>
                  <TableCell align="center">Present</TableCell>
                  <TableCell align="center">Absent</TableCell>
                  <TableCell align="center">Total Classes</TableCell>
                  <TableCell align="center">Today's Status</TableCell>
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
                        {student.rollNo || student.roll_number || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600} gutterBottom>
                          {student.attendanceRate || student.attendance || 0}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Number(student.attendanceRate || student.attendance || 0)}
                          color={getAttendanceColor(Number(student.attendanceRate || student.attendance || 0))}
                          sx={{ width: 80, mx: 'auto', height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        {student.present || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="error.main" fontWeight={600}>
                        {student.absent || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {student.totalClasses || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button
                          size="small"
                          variant={attendance[student.id] === 'present' ? 'contained' : 'outlined'}
                          color="success"
                          onClick={() => handleAttendanceChange(student.id, 'present')}
                        >
                          P
                        </Button>
                        <Button
                          size="small"
                          variant={attendance[student.id] === 'absent' ? 'contained' : 'outlined'}
                          color="error"
                          onClick={() => handleAttendanceChange(student.id, 'absent')}
                        >
                          A
                        </Button>
                        <Button
                          size="small"
                          variant={attendance[student.id] === 'leave' ? 'contained' : 'outlined'}
                          color="warning"
                          onClick={() => handleAttendanceChange(student.id, 'leave')}
                        >
                          L
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
            <Button variant="outlined" onClick={() => setAttendance({})}>
              Clear All
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveAttendance}
              disabled={Object.keys(attendance).length === 0}
            >
              Save Attendance
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeacherAttendance;
