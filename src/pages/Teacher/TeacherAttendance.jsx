import { useState } from 'react';
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

const TeacherAttendance = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState('CS-301');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});

  const courses = [
    { code: 'CS-301', name: 'Data Structures & Algorithms', students: 85 },
    { code: 'CS-201', name: 'Object Oriented Programming', students: 92 },
    { code: 'CS-101', name: 'Introduction to Computing', students: 135 },
  ];

  const stats = [
    {
      title: 'Total Students',
      value: '85',
      icon: People,
      color: 'primary.main',
      tooltip: 'Total students enrolled in the selected course. View individual attendance records and trends',
    },
    {
      title: 'Present Today',
      value: '78',
      subtitle: '+5',
      icon: CheckCircle,
      color: 'success.main',
      tooltip: 'Number of students marked present today. 5 more students attended compared to last class',
    },
    {
      title: 'Absent Today',
      value: '7',
      subtitle: '-2',
      icon: Cancel,
      color: 'error.main',
      tooltip: 'Number of students marked absent today. 2 fewer absences compared to last class',
    },
    {
      title: 'Attendance Rate',
      value: '91.8%',
      subtitle: '+2.3%',
      icon: TrendingUp,
      color: 'info.main',
      tooltip: 'Overall attendance rate for this course. Improved by 2.3% compared to previous tracking period',
    },
  ];

  const students = [
    {
      id: 1,
      name: 'Muhammad Asad',
      rollNo: 'BSCS-2023-001',
      avatar: 'https://i.pravatar.cc/150?img=12',
      attendanceRate: 88,
      present: 22,
      absent: 3,
      totalClasses: 25,
    },
    {
      id: 2,
      name: 'Ayesha Khan',
      rollNo: 'BSCS-2023-002',
      avatar: 'https://i.pravatar.cc/150?img=5',
      attendanceRate: 96,
      present: 24,
      absent: 1,
      totalClasses: 25,
    },
    {
      id: 3,
      name: 'Ali Ahmed',
      rollNo: 'BSCS-2023-003',
      avatar: 'https://i.pravatar.cc/150?img=8',
      attendanceRate: 72,
      present: 18,
      absent: 7,
      totalClasses: 25,
    },
    {
      id: 4,
      name: 'Fatima Zahra',
      rollNo: 'BSCS-2023-004',
      avatar: 'https://i.pravatar.cc/150?img=10',
      attendanceRate: 92,
      present: 23,
      absent: 2,
      totalClasses: 25,
    },
    {
      id: 5,
      name: 'Hassan Ali',
      rollNo: 'BSCS-2023-005',
      avatar: 'https://i.pravatar.cc/150?img=13',
      attendanceRate: 84,
      present: 21,
      absent: 4,
      totalClasses: 25,
    },
  ];

  const handleAttendanceChange = (studentId, value) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSaveAttendance = () => {
    console.log('Saving attendance:', attendance);
    // API call would go here
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
