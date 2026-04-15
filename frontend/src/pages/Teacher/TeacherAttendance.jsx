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
import { sisAPI } from '../../api/sis';

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
        const res = await sisAPI.getMyCourses();
        const crs = res.data?.courses || res.data || [];
        setCourses(crs.map(c => ({ code: c.code || c.id, name: c.name, students: c.students || 0 })));
        if (crs.length) setSelectedCourse(crs[0].code || crs[0].id);
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
        if (data?.students) setStudents(data.students);
        if (data?.stats) setStats(data.stats.map(s => ({ ...s, icon: { 'Total Students': People, 'Present Today': CheckCircle, 'Absent Today': Cancel, 'Attendance Rate': TrendingUp }[s.title] || People })));
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
      await attendanceAPI.markAttendance({ course: selectedCourse, date: selectedDate, records: attendance });
    } catch (e) { console.error('Failed to save attendance', e); }
  };

  const handleSelectAll = (value) => {
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student.id] = value;
    });
    setAttendance(newAttendance);
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
                        {student.rollNo}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600} gutterBottom>
                          {student.attendanceRate}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={student.attendanceRate}
                          color={getAttendanceColor(student.attendanceRate)}
                          sx={{ width: 80, mx: 'auto', height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        {student.present}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="error.main" fontWeight={600}>
                        {student.absent}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>
                        {student.totalClasses}
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
    </Box>
  );
};

export default TeacherAttendance;
