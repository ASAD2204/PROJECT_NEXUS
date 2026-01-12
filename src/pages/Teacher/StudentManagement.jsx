import React, { useState } from 'react';
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
  FilterList,
  MoreVert,
  Email,
  Phone,
  Visibility,
  Assignment,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Download,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../../components/Common/PageHeader';
import { pageTransition } from '../../utils/animations';

const StudentManagement = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterCourse, setFilterCourse] = useState('all');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const students = [
    {
      id: 1,
      name: 'Muhammad Asad',
      rollNo: 'CS-2023-001',
      email: 'asad@nexus.edu',
      phone: '+92 300 1234567',
      course: 'CS-301',
      attendance: 88,
      assignments: { submitted: 10, total: 12 },
      quizzes: { completed: 4, total: 5 },
      midterm: 85,
      final: null,
      grade: 'A-',
      cgpa: 3.85,
      status: 'active',
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    {
      id: 2,
      name: 'Ayesha Khan',
      rollNo: 'CS-2022-045',
      email: 'ayesha@nexus.edu',
      phone: '+92 301 9876543',
      course: 'CS-301',
      attendance: 92,
      assignments: { submitted: 12, total: 12 },
      quizzes: { completed: 5, total: 5 },
      midterm: 92,
      final: null,
      grade: 'A',
      cgpa: 3.92,
      status: 'active',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    {
      id: 3,
      name: 'Ali Ahmed',
      rollNo: 'CS-2023-112',
      email: 'ali@nexus.edu',
      phone: '+92 302 5551234',
      course: 'CS-301',
      attendance: 65,
      assignments: { submitted: 8, total: 12 },
      quizzes: { completed: 3, total: 5 },
      midterm: 68,
      final: null,
      grade: 'C+',
      cgpa: 3.45,
      status: 'warning',
      avatar: 'https://i.pravatar.cc/150?img=8',
    },
  ];

  const courses = [
    { value: 'all', label: 'All Courses' },
    { value: 'CS-301', label: 'CS-301 - Data Structures' },
    { value: 'CS-201', label: 'CS-201 - OOP' },
    { value: 'CS-101', label: 'CS-101 - Intro to Computing' },
  ];

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

  const getAttendanceColor = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  const getPerformanceIndicator = (grade) => {
    const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
    const index = gradeOrder.indexOf(grade);
    if (index <= 2) return { icon: TrendingUp, color: 'success' };
    if (index <= 5) return { icon: TrendingUp, color: 'info' };
    return { icon: TrendingDown, color: 'warning' };
  };

  return (
    <motion.div {...pageTransition}>
      <Box className="page-container">
        <PageHeader
          title="Student Management"
          subtitle="Monitor student performance, attendance, and grades"
        />

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Total Students
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {students.length}
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
                  {Math.round(students.reduce((sum, s) => sum + s.attendance, 0) / students.length)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Assignments Pending
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {students.reduce((sum, s) => sum + (s.assignments.total - s.assignments.submitted), 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  At Risk Students
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="error">
                  {students.filter((s) => s.status === 'warning').length}
                </Typography>
              </CardContent>
            </Card>
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
                  <Button startIcon={<Download />} variant="outlined">
                    Export
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
                    <TableCell>Course</TableCell>
                    <TableCell>Attendance</TableCell>
                    <TableCell>Assignments</TableCell>
                    <TableCell>Midterm</TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((student) => {
                    const performanceIndicator = getPerformanceIndicator(student.grade);
                    const PerformanceIcon = performanceIndicator.icon;
                    
                    return (
                      <TableRow key={student.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar src={student.avatar} alt={student.name} />
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
                        <TableCell>{student.course}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${student.attendance}%`}
                            size="small"
                            color={getAttendanceColor(student.attendance)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {student.assignments.submitted}/{student.assignments.total}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">
                            {student.midterm}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip label={student.grade} size="small" color="primary" />
                            <PerformanceIcon
                              fontSize="small"
                              color={performanceIndicator.color}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={student.status}
                            size="small"
                            color={student.status === 'active' ? 'success' : 'warning'}
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
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={students.length}
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
          <MenuItem onClick={handleMenuClose}>
            <Assignment fontSize="small" sx={{ mr: 1 }} /> Grade Assignments
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <Email fontSize="small" sx={{ mr: 1 }} /> Send Email
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <CheckCircle fontSize="small" sx={{ mr: 1 }} /> Mark Attendance
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
                  <Avatar src={selectedStudent.avatar} sx={{ width: 80, height: 80 }} />
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {selectedStudent.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedStudent.rollNo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      CGPA: {selectedStudent.cgpa}
                    </Typography>
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
                      Attendance
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedStudent.attendance}%
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">
                      Midterm Score
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedStudent.midterm}%
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default StudentManagement;
